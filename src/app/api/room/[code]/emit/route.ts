import { NextResponse } from "next/server";
import { appendEvent, getMeta, setPlayer, setResult } from "@/lib/net/room-store";
import type { RoomEvent } from "@/lib/net/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!(await getMeta(code))) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as
    | { clientId?: string; event?: RoomEvent }
    | null;
  if (!body?.event) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }
  const ev = body.event;

  // Server-side bookkeeping for reconnect/replay integrity. Moves need no
  // write here — `snapshot` derives them from the event log itself.
  switch (ev.type) {
    case "wager":
      await setPlayer(code, ev.by, {
        wagerCommit: ev.stakeCommit,
        buyInWei: ev.buyInWei,
      });
      break;
    case "ready":
      await setPlayer(code, ev.by, { ready: true });
      break;
    case "settle":
      await setResult(code, ev.winner);
      break;
  }

  await appendEvent(code, ev, body.clientId);
  return NextResponse.json({ ok: true });
}
