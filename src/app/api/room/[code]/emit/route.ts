import { NextResponse } from "next/server";
import {
  broadcast,
  getRoom,
  recordMove,
  setPlayer,
  setResult,
} from "@/lib/net/room-store";
import type { RoomEvent } from "@/lib/net/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const room = getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as
    | { clientId?: string; event?: RoomEvent }
    | null;
  if (!body?.event) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }
  const ev = body.event;

  // Server-side bookkeeping for reconnect/replay integrity.
  switch (ev.type) {
    case "move":
      recordMove(code, ev.move, ev.by);
      break;
    case "wager":
      setPlayer(code, ev.by, {
        wagerCommit: ev.stakeCommit,
        buyInWei: ev.buyInWei,
      });
      break;
    case "ready":
      setPlayer(code, ev.by, { ready: true });
      break;
    case "settle":
      setResult(code, ev.winner);
      break;
  }

  // Relay to the peer(s).
  broadcast(code, ev, body.clientId);
  return NextResponse.json({ ok: true });
}
