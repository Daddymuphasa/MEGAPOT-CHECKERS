import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/net/room-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = await req.json().catch(() => ({}));
  const res = await joinRoom(code, {
    name: typeof body.name === "string" ? body.name.slice(0, 24) : "Guest",
    address: typeof body.address === "string" ? body.address : undefined,
  });
  if ("error" in res) {
    return NextResponse.json(
      { error: res.error },
      { status: res.error === "Room not found" ? 404 : 409 },
    );
  }
  return NextResponse.json({ seat: res.seat, snapshot: res.snapshot });
}
