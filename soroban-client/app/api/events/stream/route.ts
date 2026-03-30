/**
 * GET /api/events/stream
 *
 * Server-Sent Events stream for real-time contract event updates.
 * The client receives a "events" message every POLL_INTERVAL_MS with
 * any new indexed events since the last push.
 *
 * Usage (browser):
 *   const es = new EventSource('/api/events/stream');
 *   es.addEventListener('events', (e) => console.log(JSON.parse(e.data)));
 *   es.addEventListener('heartbeat', () => {});
 */

import { NextRequest } from "next/server";
import { getIndexedEvents } from "@/lib/indexer";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 20_000;

export async function GET(_req: NextRequest) {
  let closed = false;
  let lastEventId = "";

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      const send = (event: string, data: string) => {
        if (closed) return;
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      // Initial snapshot
      const initial = await getIndexedEvents();
      if (initial.length > 0) lastEventId = initial[initial.length - 1].id;
      send("events", JSON.stringify({ events: initial, type: "snapshot" }));

      // Polling loop
      const pollTimer = setInterval(async () => {
        if (closed) return;
        try {
          const all = await getIndexedEvents();
          const lastIdx = all.findIndex((e) => e.id === lastEventId);
          const newEvents = lastIdx === -1 ? all : all.slice(lastIdx + 1);
          if (newEvents.length > 0) {
            lastEventId = newEvents[newEvents.length - 1].id;
            send("events", JSON.stringify({ events: newEvents, type: "update" }));
          }
        } catch {
          // swallow — client will reconnect via SSE retry
        }
      }, POLL_INTERVAL_MS);

      // Heartbeat to keep connection alive through proxies
      const heartbeatTimer = setInterval(() => {
        send("heartbeat", String(Date.now()));
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup when client disconnects
      const cleanup = () => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        try { controller.close(); } catch { /* already closed */ }
      };

      // ReadableStream cancel is called on client disconnect
      return cleanup;
    },
    cancel() {
      closed = true;
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
