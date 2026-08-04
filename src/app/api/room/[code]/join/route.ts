import { NextResponse } from "next/server";
import { getRoom, joinRoom, snapshot } from "@/lib/net/room-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const existing = getRoom(code);
  if (!existing) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const res = joinRoom(code, {
    name: typeof body.name === "string" ? body.name.slice(0, 24) : "Guest",
    address: typeof body.address === "string" ? body.address : undefined,
  });
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 409 });
  }
  return NextResponse.json({ seat: res.seat, snapshot: snapshot(res.room) });
}
