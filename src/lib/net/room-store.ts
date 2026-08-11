import "server-only";
import type { Move } from "@/lib/game/types";
import type { RoomEvent, RoomPlayer, RoomSnapshot, Seat } from "./protocol";
import { makeRoomCode } from "@/lib/utils";
import { backend, isDurable } from "./store-backend";

/**
 * Durable room registry.
 *
 * Every serverless invocation is a fresh process, so nothing may live in
 * module memory: room config, per-seat player records and the event log all
 * go through `backend` (Upstash Redis in production, an in-process map in
 * dev). Clients poll `readEvents` with a cursor rather than holding an SSE
 * stream, because Vercel caps function duration well below a game's length.
 */

const ROOM_TTL = 6 * 60 * 60; // 6h — matches the old gc() window
const PRESENCE_TTL = 15; // a client polling ~1/s is "gone" after 15s

export { isDurable };

/** Immutable room configuration, written once at create time. */
interface RoomMeta {
  code: string;
  createdAt: number;
  withPowers: boolean;
  wagerEnabled: boolean;
  stakeUsd: number;
  escrowGameId?: string;
}

/** An event as stored in the log, tagged with who sent it. */
export interface LoggedEvent {
  /** Emitting clientId, so the sender can filter out its own echo. */
  from?: string;
  ev: RoomEvent;
}

const kMeta = (code: string) => `mc:${code}:meta`;
const kPlayer = (code: string, seat: Seat) => `mc:${code}:p:${seat}`;
const kEvents = (code: string) => `mc:${code}:ev`;
const kResult = (code: string) => `mc:${code}:result`;
const kSeen = (code: string, clientId: string) => `mc:${code}:seen:${clientId}`;
const kSeat = (code: string, seat: Seat) => `mc:${code}:seat:${seat}`;

const norm = (code: string) => code.trim().toUpperCase();

/**
 * Build a snapshot from values already in hand.
 *
 * Upstash can serve a read from a replica that hasn't caught up with a write
 * from microseconds earlier, so callers that just wrote a player must not
 * read it straight back — they pass what they wrote instead.
 */
export function snapshotFrom(
  meta: RoomMeta,
  players: RoomPlayer[],
  moves: { move: Move; by: Seat }[] = [],
): RoomSnapshot {
  return {
    code: meta.code,
    players,
    moves,
    started: moves.length > 0,
    withPowers: meta.withPowers,
    wagerEnabled: meta.wagerEnabled,
    stakeUsd: meta.stakeUsd,
    escrowGameId: meta.escrowGameId,
  };
}

export async function createRoom(opts: {
  withPowers: boolean;
  wagerEnabled: boolean;
  stakeUsd: number;
  hostName: string;
  hostAddress?: string;
  escrowGameId?: string;
}): Promise<{ meta: RoomMeta; host: RoomPlayer }> {
  // Claim a free code. Collisions are vanishingly rare, but NX makes the
  // check atomic rather than read-then-write.
  let code = makeRoomCode();
  for (let i = 0; i < 5; i++) {
    const meta: RoomMeta = {
      code,
      createdAt: Date.now(),
      withPowers: opts.withPowers,
      wagerEnabled: opts.wagerEnabled,
      stakeUsd: opts.stakeUsd,
      escrowGameId: opts.escrowGameId,
    };
    if (await backend.setIfAbsent(kMeta(code), meta, ROOM_TTL)) {
      const host: RoomPlayer = {
        seat: "host",
        name: opts.hostName || "Host",
        address: opts.hostAddress,
        ready: false,
      };
      await backend.set(kPlayer(code, "host"), host, ROOM_TTL);
      return { meta, host };
    }
    code = makeRoomCode();
  }
  throw new Error("Could not allocate a room code");
}

export async function getMeta(code: string): Promise<RoomMeta | null> {
  return backend.get<RoomMeta>(kMeta(norm(code)));
}

export async function getPlayers(code: string): Promise<RoomPlayer[]> {
  const c = norm(code);
  const [host, guest] = await backend.mget<RoomPlayer>([
    kPlayer(c, "host"),
    kPlayer(c, "guest"),
  ]);
  return [host, guest].filter((p): p is RoomPlayer => p !== null);
}

/**
 * Claim the guest seat. `setIfAbsent` makes this race-free: if two people
 * open the same code at once, exactly one gets the seat.
 */
export async function joinRoom(
  code: string,
  opts: { name: string; address?: string },
): Promise<{ seat: Seat; snapshot: RoomSnapshot } | { error: string }> {
  const c = norm(code);
  const meta = await getMeta(c);
  if (!meta) return { error: "Room not found" };

  const claimed = await backend.setIfAbsent(
    kSeat(c, "guest"),
    Date.now(),
    ROOM_TTL,
  );
  if (!claimed) return { error: "Room is full" };

  const guest: RoomPlayer = {
    seat: "guest",
    name: opts.name || "Guest",
    address: opts.address,
    ready: false,
  };
  await backend.set(kPlayer(c, "guest"), guest, ROOM_TTL);
  await appendEvent(c, { type: "peer-joined", name: guest.name, seat: "guest" });

  // Read only the host back; pair it with the guest we just wrote rather than
  // re-reading a value that may not have replicated yet.
  const [host, moves] = await Promise.all([
    backend.get<RoomPlayer>(kPlayer(c, "host")),
    readMoves(c),
  ]);
  const players = host ? [host, guest] : [guest];
  return { seat: "guest", snapshot: snapshotFrom(meta, players, moves) };
}

/** Moves are derived from the event log rather than stored separately. */
async function readMoves(code: string): Promise<{ move: Move; by: Seat }[]> {
  const log = await backend.range<LoggedEvent>(kEvents(norm(code)), 0, -1);
  return log
    .filter((l) => l.ev.type === "move")
    .map((l) => {
      const ev = l.ev as Extract<RoomEvent, { type: "move" }>;
      return { move: ev.move, by: ev.by };
    });
}

export async function snapshot(code: string): Promise<RoomSnapshot> {
  const c = norm(code);
  const [meta, players, moves] = await Promise.all([
    getMeta(c),
    getPlayers(c),
    readMoves(c),
  ]);
  const fallback: RoomMeta = {
    code: c,
    createdAt: 0,
    withPowers: true,
    wagerEnabled: false,
    stakeUsd: 0,
  };
  return snapshotFrom(meta ?? fallback, players, moves);
}

/** Append to the room's event log. Readers pick it up on their next poll. */
export async function appendEvent(
  code: string,
  ev: RoomEvent,
  from?: string,
): Promise<void> {
  await backend.push(kEvents(norm(code)), { from, ev } satisfies LoggedEvent, ROOM_TTL);
}

/** Events after `since`, plus the new cursor. */
export async function readEvents(
  code: string,
  since: number,
): Promise<{ events: LoggedEvent[]; cursor: number }> {
  const from = Math.max(0, since);
  const events = await backend.range<LoggedEvent>(kEvents(norm(code)), from, -1);
  return { events, cursor: from + events.length };
}

export async function setPlayer(
  code: string,
  seat: Seat,
  patch: Partial<RoomPlayer>,
): Promise<void> {
  const c = norm(code);
  const current = await backend.get<RoomPlayer>(kPlayer(c, seat));
  if (!current) return;
  await backend.set(kPlayer(c, seat), { ...current, ...patch }, ROOM_TTL);
}

export async function setResult(code: string, result: string): Promise<void> {
  await backend.set(kResult(norm(code)), result, ROOM_TTL);
}

/** Refresh this client's presence marker. */
export async function touchClient(code: string, clientId: string): Promise<void> {
  await backend.touch(kSeen(norm(code), clientId), PRESENCE_TTL);
}

/**
 * Which seats currently have a live client. Derived from self-expiring
 * presence keys, so a crashed tab drops out on its own.
 */
export async function presence(
  code: string,
): Promise<Record<Seat, boolean>> {
  const c = norm(code);
  const players = await getPlayers(c);
  const seats = players.map((p) => p.seat);
  const marks = await backend.exists(
    seats.map((s) => `mc:${c}:live:${s}`),
  );
  const out: Record<Seat, boolean> = { host: false, guest: false };
  seats.forEach((s, i) => (out[s] = marks[i]));
  return out;
}

/** Mark a seat as live (called on every poll). */
export async function touchSeat(code: string, seat: Seat): Promise<void> {
  await backend.touch(`mc:${norm(code)}:live:${seat}`, PRESENCE_TTL);
}
