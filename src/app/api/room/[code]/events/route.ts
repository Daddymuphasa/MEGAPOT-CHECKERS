import {
  addClient,
  broadcast,
  getRoom,
  removeClient,
  snapshot,
} from "@/lib/net/room-store";
import type { RoomEvent, Seat } from "@/lib/net/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? crypto.randomUUID();
  const seat = (url.searchParams.get("seat") as Seat) ?? "guest";

  const room = getRoom(code);
  if (!room) return new Response("Room not found", { status: 404 });

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (ev: RoomEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };

      addClient(code, { clientId, seat, send });

      // Initial hello with full snapshot so late joiners / reconnects catch up.
      send({ type: "hello", role: seat, you: clientId, snapshot: snapshot(room) });

      // Heartbeat keeps proxies from closing the connection.
      const hb = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(hb);
        removeClient(code, clientId);
        broadcast(code, { type: "peer-left", seat });
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
