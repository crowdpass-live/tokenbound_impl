"use client";

import { useEffect } from "react";
import { useSoroban } from "@/contexts/SorobanContext";
import { useGetAllEvents, useGetEventCount } from "@/hooks/useEventManager";
import { useEventStore } from "@/lib/stores/eventStore";

export function EventDashboard() {
  const { sdk } = useSoroban();
  const {
    events: storeEvents,
    setEvents,
    setLoading,
    setError,
    loading: storeLoading,
    error: storeError,
  } = useEventStore();

  const {
    data: contractEvents,
    loading: contractLoading,
    error: contractError,
    refetch,
  } = useGetAllEvents(sdk, {
    enabled: true,
    refetchInterval: 30000,
  });

  const { data: eventCount } = useGetEventCount(sdk, { enabled: true });

  useEffect(() => {
    setLoading(contractLoading);
  }, [contractLoading, setLoading]);

  useEffect(() => {
    if (contractError) {
      setError(contractError.message);
    } else {
      setError(null);
    }
  }, [contractError, setError]);

  useEffect(() => {
    if (contractEvents) {
      setEvents(contractEvents);
    }
  }, [contractEvents, setEvents]);

  const activeEvents = storeEvents.filter((e) => !e.isCanceled);
  const canceledEvents = storeEvents.filter((e) => e.isCanceled);
  const totalTicketsSold = storeEvents.reduce(
    (sum, e) => sum + Number(e.ticketsSold),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Event Dashboard</h2>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Events</div>
          <div className="text-3xl font-bold">{eventCount || 0}</div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Active Events</div>
          <div className="text-3xl font-bold text-green-600">
            {activeEvents.length}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Canceled Events</div>
          <div className="text-3xl font-bold text-red-600">
            {canceledEvents.length}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-1">Total Tickets Sold</div>
          <div className="text-3xl font-bold text-blue-600">
            {totalTicketsSold}
          </div>
        </div>
      </div>

      {storeLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Loading events...</span>
        </div>
      )}

      {storeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {storeError}</p>
        </div>
      )}

      {!storeLoading && !storeError && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Active Events</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {activeEvents.length === 0 && (
              <p className="text-gray-500 text-center py-8">No active events</p>
            )}
          </div>

          {canceledEvents.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Canceled Events</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {canceledEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const { selectEvent } = useEventStore();
  const soldPercentage = Number(
    (event.ticketsSold * 100n) / event.totalTickets,
  );

  return (
    <div
      onClick={() => selectEvent(event)}
      className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-lg">{event.theme}</h4>
        {event.isCanceled && (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
            Canceled
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <p>Type: {event.eventType}</p>
        <p>Price: {event.ticketPrice.toString()} tokens</p>
        <p>Date: {new Date(event.startDate * 1000).toLocaleDateString()}</p>

        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span>Tickets Sold</span>
            <span>{soldPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${soldPercentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {event.ticketsSold.toString()} / {event.totalTickets.toString()}
          </div>
        </div>
      </div>
    </div>
  );
}
