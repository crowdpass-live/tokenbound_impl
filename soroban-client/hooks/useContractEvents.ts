"use client";

/**
 * useContractEvents
 *
 * Fetches indexed contract events from /api/events and subscribes to
 * /api/events/stream for real-time updates via SSE.
 *
 * Usage:
 *   const { events, loading, error, refetch } = useContractEvents({ organizer, status });
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { IndexedEvent, EventQueryParams } from "@/lib/indexer";

interface UseContractEventsResult {
  events: IndexedEvent[];
  total: number;
  loading: boolean;
  error: string | null;
  updatedAt: number;
  refetch: () => void;
}

export function useContractEvents(
  params: Omit<EventQueryParams, "offset" | "limit"> & {
    limit?: number;
    offset?: number;
    realtime?: boolean; // default true
  } = {},
): UseContractEventsResult {
  const { realtime = true, ...queryParams } = params;

  const [events, setEvents] = useState<IndexedEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const cursorRef = useRef<string>("");
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectDelayRef = useRef(1000); // Start with 1s delay

  const buildUrl = useCallback(() => {
    const sp = new URLSearchParams();
    if (queryParams.organizer) sp.set("organizer", queryParams.organizer);
    if (queryParams.status) sp.set("status", queryParams.status);
    if (queryParams.type) sp.set("type", queryParams.type);
    if (queryParams.from) sp.set("from", String(queryParams.from));
    if (queryParams.to) sp.set("to", String(queryParams.to));
    if (queryParams.limit) sp.set("limit", String(queryParams.limit));
    if (queryParams.offset) sp.set("offset", String(queryParams.offset));
    return `/api/events?${sp}`;
  }, [
    queryParams.organizer,
    queryParams.status,
    queryParams.type,
    queryParams.from,
    queryParams.to,
    queryParams.limit,
    queryParams.offset,
  ]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
      setUpdatedAt(data.updatedAt ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  // Initial fetch
  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // SSE subscription for real-time updates
  useEffect(() => {
    if (!realtime) return;

    const connectSSE = () => {
      // Build URL with cursor for reconnection
      const streamUrl = cursorRef.current
        ? `/api/events/stream?cursor=${encodeURIComponent(cursorRef.current)}`
        : "/api/events/stream";

      const es = new EventSource(streamUrl);
      esRef.current = es;

      es.addEventListener("events", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data as string) as {
            events: IndexedEvent[];
            type: "snapshot" | "update";
          };

          if (payload.type === "snapshot") {
            setEvents(payload.events);
            setTotal(payload.events.length);
          } else if (payload.type === "update" && payload.events.length > 0) {
            // Re-fetch with current filters to get accurate filtered results
            void fetchEvents();
          }

          // Update cursor from event ID
          if (payload.events.length > 0) {
            const lastEvent = payload.events[payload.events.length - 1];
            cursorRef.current = `${lastEvent.ledger}-0-0-0`;
          }

          // Reset reconnect attempts on successful connection
          reconnectAttemptsRef.current = 0;
          reconnectDelayRef.current = 1000;
        } catch {
          /* ignore parse errors */
        }
      });

      // Handle reconnection/replay events
      es.addEventListener("reconnect", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data as string) as {
            events: IndexedEvent[];
            type: "replay";
            cursor: string;
          };

          if (payload.type === "replay" && payload.events.length > 0) {
            // Merge replayed events with existing events
            setEvents((prev: IndexedEvent[]) => {
              const existingIds = new Set(prev.map((e: IndexedEvent) => e.id));
              const newEvents = payload.events.filter(
                (e: IndexedEvent) => !existingIds.has(e.id),
              );
              return [...prev, ...newEvents];
            });
            void fetchEvents();
          }

          // Update cursor
          if (payload.cursor) {
            cursorRef.current = payload.cursor;
          }

          // Reset reconnect attempts
          reconnectAttemptsRef.current = 0;
          reconnectDelayRef.current = 1000;
        } catch {
          /* ignore parse errors */
        }
      });

      es.addEventListener("heartbeat", () => {
        // Connection is alive
      });

      es.onerror = () => {
        // Connection dropped - will attempt to reconnect with cursor
        console.warn(
          "SSE connection dropped, will reconnect with cursor:",
          cursorRef.current,
        );

        // Close the current connection
        es.close();
        esRef.current = null;

        // Implement exponential backoff for reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelayRef.current;
          reconnectAttemptsRef.current++;
          // Exponential backoff: double the delay each time, max 30s
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            30000,
          );

          console.log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`,
          );
          setTimeout(connectSSE, delay);
        } else {
          setError("Failed to maintain connection after maximum retries");
        }
      };
    };

    connectSSE();

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [realtime, fetchEvents]);

  return {
    events,
    total,
    loading,
    error,
    updatedAt,
    refetch: fetchEvents,
  };
}
