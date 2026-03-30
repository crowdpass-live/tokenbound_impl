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
  } = {}
): UseContractEventsResult {
  const { realtime = true, ...queryParams } = params;

  const [events, setEvents] = useState<IndexedEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(0);
  const esRef = useRef<EventSource | null>(null);

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

    const es = new EventSource("/api/events/stream");
    esRef.current = es;

    es.addEventListener("events", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data as string) as {
          events: IndexedEvent[];
          type: "snapshot" | "update";
        };
        if (payload.type === "update" && payload.events.length > 0) {
          // Re-fetch with current filters to get accurate filtered results
          void fetchEvents();
        }
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => {
      // Browser will auto-reconnect SSE; no action needed
    };

    return () => {
      es.close();
      esRef.current = null;
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
