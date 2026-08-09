import { NextResponse } from "next/server";
import {
  getMeta,
  presence,
  readEvents,
  snapshot,
  touchClient,
  touchSeat,
} from "@/lib/net/room-store";
import type { Seat } from "@/lib/net/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Poll for room events.
 *
 * Replaces the old SSE stream: Vercel caps function duration far below a
 * game's length, so a held-open connection would drop mid-match. Clients
 * poll with a cursor instead.
 *
 *   GET ?clientId=…&seat=…          → handshake: [hello] + cursor at log end
 *   GET ?clientId=…&seat=…&since=N  → events after N
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? "";
  const seat = (url.searchParams.get("seat") as Seat) ?? "guest";
  const sinceRaw = url.searchParams.get("since");

  const meta = await getMeta(code);
  if (!meta) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Presence: refreshed every poll, self-expiring so a closed tab drops out.
  await Promise.all([touchClient(code, clientId), touchSeat(code, seat)]);

  // Handshake — send the full snapshot and start the cursor at the current
  // end of the log, so historical events aren't replayed on top of it.
  if (sinceRaw === null) {
    const [snap, { cursor }] = await Promise.all([
      snapshot(code),
      readEvents(code, 0),
    ]);
    return NextResponse.json({
      cursor,
      events: [{ type: "hello", role: seat, you: clientId, snapshot: snap }],
      players: snap.players,
      presence: await presence(code),
    });
  }

  const since = Number.parseInt(sinceRaw, 10);
  const { events, cursor } = await readEvents(
    code,
    Number.isFinite(since) ? since : 0,
  );

  const [players, live] = await Promise.all([
    snapshot(code).then((s) => s.players),
    presence(code),
  ]);

  return NextResponse.json({
    cursor,
    // Don't echo a client its own events.
    events: events.filter((l) => l.from !== clientId).map((l) => l.ev),
    players,
    presence: live,
  });
}
