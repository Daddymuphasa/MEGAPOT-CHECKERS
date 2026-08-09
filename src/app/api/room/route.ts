import { NextResponse } from "next/server";
import { createRoom, isDurable, snapshot } from "@/lib/net/room-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const stakeUsd = Math.max(0, Math.min(100, Math.round(Number(body.stakeUsd)) || 0));
  const meta = await createRoom({
    withPowers: !!body.withPowers,
    wagerEnabled: stakeUsd > 0,
    stakeUsd,
    hostName: typeof body.name === "string" ? body.name.slice(0, 24) : "Host",
    hostAddress: typeof body.address === "string" ? body.address : undefined,
    escrowGameId:
      typeof body.escrowGameId === "string" ? body.escrowGameId : undefined,
  });
  return NextResponse.json({
    code: meta.code,
    snapshot: await snapshot(meta.code),
    // Surfaced so the lobby can warn that rooms won't survive across
    // serverless instances when Redis isn't wired up.
    durable: isDurable,
  });
}
