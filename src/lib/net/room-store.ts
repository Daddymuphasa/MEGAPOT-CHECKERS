import "server-only";
import type { Move } from "@/lib/game/types";
import type { RoomEvent, RoomPlayer, RoomSnapshot, Seat } from "./protocol";
import { makeRoomCode } from "@/lib/utils";

interface Client {
  clientId: string;
  seat: Seat;
  send: (ev: RoomEvent) => void;
}

interface Room {
  code: string;
  createdAt: number;
  players: RoomPlayer[];
  clients: Client[];
  moves: { move: Move; by: Seat }[];
  started: boolean;
  withPowers: boolean;
  wagerEnabled: boolean;
  result?: string;
}

/**
 * In-memory room registry. Survives dev HMR via globalThis. This works for a
 * single Node process (`next dev` / a single `next start` instance). For a
 * multi-instance production deploy, swap this module for a durable pub/sub
 * (e.g. Upstash Redis) — the surface is intentionally tiny. See README.
 */
const g = globalThis as unknown as { __megapotRooms?: Map<string, Room> };
g.__megapotRooms ??= new Map<string, Room>();
const rooms = g.__megapotRooms;

// Garbage-collect stale rooms (older than 6h) opportunistically.
function gc() {
  const cutoff = Date.now() - 6 * 60 * 60 * 1000;
  for (const [code, room] of rooms) {
    if (room.createdAt < cutoff && room.clients.length === 0) rooms.delete(code);
  }
}

export function createRoom(opts: {
  withPowers: boolean;
  wagerEnabled: boolean;
  hostName: string;
  hostAddress?: string;
}): Room {
  gc();
  let code = makeRoomCode();
  while (rooms.has(code)) code = makeRoomCode();
  const room: Room = {
    code,
    createdAt: Date.now(),
    players: [
      {
        seat: "host",
        name: opts.hostName || "Host",
        address: opts.hostAddress,
        ready: false,
      },
    ],
    clients: [],
    moves: [],
    started: false,
    withPowers: opts.withPowers,
    wagerEnabled: opts.wagerEnabled,
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(
  code: string,
  opts: { name: string; address?: string },
): { room: Room; seat: Seat } | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: "Room not found" };
  const existingGuest = room.players.find((p) => p.seat === "guest");
  if (!existingGuest) {
    room.players.push({
      seat: "guest",
      name: opts.name || "Guest",
      address: opts.address,
      ready: false,
    });
    broadcast(code, { type: "peer-joined", name: opts.name, seat: "guest" });
    return { room, seat: "guest" };
  }
  // Room full → allow only a reconnect by the same seat (spectators not allowed).
  return { error: "Room is full" };
}

export function snapshot(room: Room): RoomSnapshot {
  return {
    code: room.code,
    players: room.players.map((p) => ({ ...p })),
    moves: room.moves.map((m) => ({ ...m })),
    started: room.started,
    withPowers: room.withPowers,
    wagerEnabled: room.wagerEnabled,
  };
}

export function addClient(code: string, client: Client) {
  const room = getRoom(code);
  if (!room) return;
  room.clients.push(client);
}

export function removeClient(code: string, clientId: string) {
  const room = getRoom(code);
  if (!room) return;
  room.clients = room.clients.filter((c) => c.clientId !== clientId);
}

/** Send an event to every client except the optional excluded clientId. */
export function broadcast(code: string, ev: RoomEvent, exceptClientId?: string) {
  const room = getRoom(code);
  if (!room) return;
  for (const c of room.clients) {
    if (c.clientId === exceptClientId) continue;
    try {
      c.send(ev);
    } catch {
      /* dropped client; cleaned up on stream close */
    }
  }
}

export function recordMove(code: string, move: Move, by: Seat) {
  const room = getRoom(code);
  if (!room) return;
  room.started = true;
  room.moves.push({ move, by });
}

export function setPlayer(
  code: string,
  seat: Seat,
  patch: Partial<RoomPlayer>,
) {
  const room = getRoom(code);
  if (!room) return;
  const p = room.players.find((x) => x.seat === seat);
  if (p) Object.assign(p, patch);
}

export function setResult(code: string, result: string) {
  const room = getRoom(code);
  if (room) room.result = result;
}
