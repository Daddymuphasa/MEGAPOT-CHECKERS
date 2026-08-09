/**
 * End-to-end test for the room transport against a running dev server.
 *
 *   npm run dev            # in another terminal
 *   npx tsx src/lib/net/client.test.ts
 *
 * Drives two real RoomConnection instances through a full match to check
 * cursor handling, echo filtering and peer-left synthesis.
 */
import { RoomConnection } from "./client";
import type { RoomEvent } from "./protocol";
import type { Move, Pos } from "@/lib/game/types";

const move = (from: Pos, to: Pos): Move => ({
  from,
  to,
  captures: [],
  path: [to],
  promote: false,
});

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// RoomConnection uses browser-relative URLs; point them at the dev server.
const realFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" && input.startsWith("/") ? BASE + input : input;
  return realFetch(url as RequestInfo | URL, init);
}) as typeof fetch;

let failures = 0;
function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}`, extra !== undefined ? JSON.stringify(extra) : "");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function collector(c: RoomConnection) {
  const seen: RoomEvent[] = [];
  c.onEvent((ev) => seen.push(ev));
  return seen;
}

async function main() {
  console.log(`\nRoom transport E2E against ${BASE}\n`);

  // ---- create + join ----
  const { code, durable } = await RoomConnection.create({
    name: "Alice",
    withPowers: true,
    wagerEnabled: false,
    stakeUsd: 0,
  });
  console.log(`  room ${code} (durable backend: ${durable})\n`);

  const host = new RoomConnection();
  const hostSeen = collector(host);
  let hostOnline = false;
  host.onStatus((o) => (hostOnline = o));
  host.connect(code, "host");

  await sleep(900);
  check("host receives hello", hostSeen[0]?.type === "hello", hostSeen[0]?.type);
  check("host reports connected", hostOnline);

  const joined = await RoomConnection.join(code, { name: "Bob" });
  check("guest gets guest seat", joined.seat === "guest", joined.seat);

  const guest = new RoomConnection();
  const guestSeen = collector(guest);
  guest.connect(code, "guest");
  await sleep(1400);

  check("guest receives hello", guestSeen[0]?.type === "hello", guestSeen[0]?.type);
  check(
    "host sees peer-joined",
    hostSeen.some((e) => e.type === "peer-joined"),
    hostSeen.map((e) => e.type),
  );
  check(
    "guest does NOT replay its own peer-joined",
    !guestSeen.some((e) => e.type === "peer-joined"),
    guestSeen.map((e) => e.type),
  );

  // ---- moves relay one way only ----
  const hostBefore = hostSeen.length;
  await host.emit({
    type: "move",
    by: "host",
    ply: 1,
    move: move({ row: 5, col: 0 }, { row: 4, col: 1 }),
  });
  await sleep(1600);

  check(
    "guest receives host move",
    guestSeen.some((e) => e.type === "move" && e.by === "host"),
    guestSeen.map((e) => e.type),
  );
  check(
    "host does not receive its own move back",
    hostSeen.length === hostBefore ||
      !hostSeen.slice(hostBefore).some((e) => e.type === "move"),
    hostSeen.slice(hostBefore).map((e) => e.type),
  );

  // ---- reply in the other direction ----
  await guest.emit({
    type: "move",
    by: "guest",
    ply: 2,
    move: move({ row: 2, col: 1 }, { row: 3, col: 2 }),
  });
  await sleep(1600);
  check(
    "host receives guest move",
    hostSeen.some((e) => e.type === "move" && e.by === "guest"),
    hostSeen.map((e) => e.type),
  );

  // ---- reconnect replays history via hello snapshot ----
  const rejoin = new RoomConnection();
  const rejoinSeen = collector(rejoin);
  rejoin.connect(code, "host");
  await sleep(1200);
  const hello = rejoinSeen.find((e) => e.type === "hello");
  const moveCount = hello && hello.type === "hello" ? hello.snapshot.moves.length : -1;
  check("reconnect replays both moves", moveCount === 2, moveCount);
  rejoin.close();

  // ---- peer-left fires when a client stops polling ----
  guest.close();
  console.log("  (waiting out presence TTL ~16s for peer-left…)");
  await sleep(18000);
  check(
    "host sees peer-left after guest closes",
    hostSeen.some((e) => e.type === "peer-left"),
    hostSeen.map((e) => e.type),
  );

  host.close();

  console.log(
    failures === 0
      ? "\nAll transport checks passed.\n"
      : `\n${failures} check(s) FAILED.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("test crashed:", e);
  process.exit(1);
});
