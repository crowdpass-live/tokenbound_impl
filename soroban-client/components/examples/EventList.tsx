"use client";

import { useSoroban } from "@/contexts/SorobanContext";
import { useGetAllEvents } from "@/hooks/useEventManager";

export function EventList() {
  const { sdk } = useSoroban();
  const {
    data: events,
    loading,
    error,
    refetch,
  } = useGetAllEvents(sdk, {
    enabled: true,
    refetchInterval: 30000,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600">Loading events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading events: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <div className="text-center p-8 text-gray-500">No events found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Events ({events.length})</h2>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <div
            key={event.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg mb-2">{event.theme}</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Type: {event.eventType}</p>
              <p>Price: {event.ticketPrice.toString()} tokens</p>
              <p>
                Tickets: {event.ticketsSold.toString()} /{" "}
                {event.totalTickets.toString()}
              </p>
              <p>
                Date: {new Date(event.startDate * 1000).toLocaleDateString()}
              </p>
              {event.isCanceled && (
                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                  Canceled
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
