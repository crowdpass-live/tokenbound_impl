/**
 * GET /api/events/stream
 *
 * Server-Sent Events stream for real-time contract event updates.
 * Supports cursor-based reconnection to replay missed events.
 *
 * Query params:
 *   cursor  – Optional cursor to resume from (format: "ledger-0-0-0")
 *
 * Headers:
 *   Last-Event-ID – Auto-sent by browser on reconnect, contains last event ID
 *
 * Usage (browser):
 *   const es = new EventSource('/api/events/stream');
 *   es.addEventListener('events', (e) => console.log(JSON.parse(e.data)));
 *   es.addEventListener('heartbeat', () => {});
 */

import { NextRequest } from "next/server";
import {
  getIndexedEvents,
  getEventsAfterCursor,
  getLatestCursor,
} from "@/lib/indexer";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 20_000;

export async function GET(req: NextRequest) {
  let closed = false;
  let lastEventId = "";
  let cursor = "";

  // Extract cursor from query params for reconnection
  const urlCursor = req.nextUrl.searchParams.get("cursor");
  if (urlCursor) {
    cursor = urlCursor;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      const send = (event: string, data: string, id?: string) => {
        if (closed) return;
        let message = `event: ${event}\ndata: ${data}\n`;
        if (id) {
          message += `id: ${id}\n`;
        }
        message += `\n`;
        controller.enqueue(enc.encode(message));
      };

      // Determine which events to send based on cursor
      let initialEvents: Awaited<ReturnType<typeof getIndexedEvents>>;
      if (cursor) {
        // Replay events after the cursor for reconnection
        initialEvents = getEventsAfterCursor(cursor);
        send(
          "reconnect",
          JSON.stringify({
            events: initialEvents,
            type: "replay",
            cursor: cursor,
          }),
        );
      } else {
        // Initial snapshot
        initialEvents = await getIndexedEvents();
        if (initialEvents.length > 0) {
          lastEventId = initialEvents[initialEvents.length - 1].id;
        }
        send(
          "events",
          JSON.stringify({ events: initialEvents, type: "snapshot" }),
          lastEventId || undefined,
        );
      }

      // Update cursor tracking
      if (initialEvents.length > 0) {
        const latestEvent = initialEvents[initialEvents.length - 1];
        cursor = `${latestEvent.ledger}-0-0-0`;
        lastEventId = latestEvent.id;
      }

      // Polling loop
      const pollTimer = setInterval(async () => {
        if (closed) return;
        try {
          const all = await getIndexedEvents();
          const lastIdx = all.findIndex((e) => e.id === lastEventId);
          const newEvents = lastIdx === -1 ? all : all.slice(lastIdx + 1);
          if (newEvents.length > 0) {
            lastEventId = newEvents[newEvents.length - 1].id;
            cursor = `${newEvents[newEvents.length - 1].ledger}-0-0-0`;
            send(
              "events",
              JSON.stringify({ events: newEvents, type: "update" }),
              lastEventId,
            );
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
        try {
          controller.close();
        } catch {
          /* already closed */
        }
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
