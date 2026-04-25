"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@/contexts/WalletContext";
import {
  cancelEvent,
  claimFunds,
  getAllEvents,
  getEventAttendees,
  updateEvent,
  type Event,
} from "@/lib/soroban";

type ModalState =
  | { type: "none" }
  | { type: "attendees"; eventId: number }
  | { type: "update"; event: Event };

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

function formatXLM(stroops: bigint) {
  return (Number(stroops) / 1e7).toFixed(2) + " XLM";
}

function EventStatusBadge({ event }: { event: Event }) {
  const now = Date.now() / 1000;
  let label = "Upcoming";
  let cls = "bg-blue-500/20 text-blue-300";
  if (event.is_canceled) {
    label = "Canceled";
    cls = "bg-red-500/20 text-red-300";
  } else if (now > event.end_date) {
    label = "Completed";
    cls = "bg-green-500/20 text-green-300";
  } else if (now >= event.start_date) {
    label = "Live";
    cls = "bg-yellow-500/20 text-yellow-300";
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

function AttendeesModal({
  eventId,
  readerAccount,
  onClose,
}: {
  eventId: number;
  readerAccount: string;
  onClose: () => void;
}) {
  const [attendees, setAttendees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEventAttendees(eventId, readerAccount)
      .then(setAttendees)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId, readerAccount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 dark:border-white/10 dark:bg-[#27272A] dark:text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Attendees</h2>
          <button onClick={onClose} className="text-zinc-500 transition hover:text-zinc-950 dark:text-gray-400 dark:hover:text-white">
            ✕
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-zinc-500 dark:text-gray-400">Loading…</p>
        ) : attendees.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-gray-400">No attendees yet.</p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {attendees.map((addr) => (
              <li
                key={addr}
                className="break-all rounded-lg bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-700 dark:bg-white/5 dark:text-gray-300"
              >
                {addr}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UpdateEventModal({
  event,
  onClose,
  onSuccess,
}: {
  event: Event;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { address, signTransaction } = useWallet();
  const [theme, setTheme] = useState(event.theme);
  const [price, setPrice] = useState(
    (Number(event.ticket_price) / 1e7).toString()
  );
  const [totalTickets, setTotalTickets] = useState(
    event.total_tickets.toString()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setSubmitting(true);
    setError("");
    try {
      await updateEvent(
        {
          organizer: address,
          event_id: event.id,
          theme: theme !== event.theme ? theme : undefined,
          ticket_price:
            price !== (Number(event.ticket_price) / 1e7).toString()
              ? BigInt(Math.floor(parseFloat(price) * 1e7))
              : undefined,
          total_tickets:
            totalTickets !== event.total_tickets.toString()
              ? BigInt(totalTickets)
              : undefined,
        },
        signTransaction
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 dark:border-white/10 dark:bg-[#27272A] dark:text-white">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-zinc-950 dark:text-white">Update Event</h2>
          <button onClick={onClose} className="text-zinc-500 transition hover:text-zinc-950 dark:text-gray-400 dark:hover:text-white">
            ✕
          </button>
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-gray-400">
              Event Name
            </label>
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#FF5722] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-gray-400">
              Ticket Price (XLM)
            </label>
            <input
              type="number"
              step="0.0000001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#FF5722] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-500 dark:text-gray-400">
              Total Tickets
            </label>
            <input
              type="number"
              min="1"
              value={totalTickets}
              onChange={(e) => setTotalTickets(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#FF5722] focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#FF5722] hover:bg-[#F4511E] text-white py-2 rounded-lg font-semibold disabled:opacity-50 transition"
          >
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EventCard({
  event,
  onCancel,
  onClaim,
  onViewAttendees,
  onUpdate,
}: {
  event: Event;
  onCancel: (id: number) => void;
  onClaim: (id: number) => void;
  onViewAttendees: (id: number) => void;
  onUpdate: (event: Event) => void;
}) {
  const now = Date.now() / 1000;
  const isCompleted = !event.is_canceled && now > event.end_date;
  const revenue = event.tickets_sold * event.ticket_price;

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-lg shadow-zinc-900/5 dark:border-white/5 dark:bg-[#27272A] dark:text-white dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-white">{event.theme}</h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-gray-400">{event.event_type}</p>
        </div>
        <EventStatusBadge event={event} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-100 p-3 text-center dark:bg-white/5">
          <p className="text-lg font-bold text-zinc-950 dark:text-white">
            {event.tickets_sold.toString()}
          </p>
          <p className="text-xs text-zinc-500 dark:text-gray-400">Sold</p>
        </div>
        <div className="rounded-lg bg-zinc-100 p-3 text-center dark:bg-white/5">
          <p className="text-lg font-bold text-zinc-950 dark:text-white">
            {event.total_tickets.toString()}
          </p>
          <p className="text-xs text-zinc-500 dark:text-gray-400">Total</p>
        </div>
        <div className="rounded-lg bg-zinc-100 p-3 text-center dark:bg-white/5">
          <p className="text-lg font-bold text-zinc-950 dark:text-white">{formatXLM(revenue)}</p>
          <p className="text-xs text-zinc-500 dark:text-gray-400">Revenue</p>
        </div>
      </div>

      <div className="space-y-1 text-xs text-zinc-500 dark:text-gray-400">
        <p>Start: {formatDate(event.start_date)}</p>
        <p>End: {formatDate(event.end_date)}</p>
        <p>Price: {formatXLM(event.ticket_price)}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onViewAttendees(event.id)}
          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          Attendees
        </button>
        {!event.is_canceled && (
          <>
            <button
              onClick={() => onUpdate(event)}
              className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-700 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
            >
              Edit
            </button>
            <button
              onClick={() => onCancel(event.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition"
            >
              Cancel
            </button>
          </>
        )}
        {isCompleted && (
          <button
            onClick={() => onClaim(event.id)}
            className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 transition"
          >
            Claim Funds
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { address, isConnected, isInstalled, connect, signTransaction } =
    useWallet();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: "none" });
  const [actionMsg, setActionMsg] = useState("");

  const myEvents = events.filter(
    (e) => e.organizer.toLowerCase() === address?.toLowerCase()
  );

  const fetchEvents = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      const all = await getAllEvents(address);
      setEvents(all);
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchEvents();
  }, [isConnected, address, fetchEvents]);

  const handleCancel = async (eventId: number) => {
    if (!address) return;
    if (!confirm("Cancel this event? Attendees will be eligible for refunds."))
      return;
    try {
      await cancelEvent(address, eventId, signTransaction);
      setActionMsg("Event canceled successfully.");
      fetchEvents();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  const handleClaim = async (eventId: number) => {
    if (!address) return;
    try {
      await claimFunds(address, eventId, signTransaction);
      setActionMsg("Funds claimed successfully.");
      fetchEvents();
    } catch (err: any) {
      setActionMsg(`Error: ${err.message}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">Organizer Dashboard</h1>
          <p className="text-zinc-500 dark:text-gray-400">Connect your wallet to manage your events.</p>
          <button
            onClick={() => {
              if (!isInstalled) {
                alert("Please install Freighter wallet extension.");
                return;
              }
              connect();
            }}
            className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-6 py-2 rounded-lg font-bold transition"
          >
            {isInstalled ? "Connect Wallet" : "Install Freighter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {modal.type === "attendees" && address && (
        <AttendeesModal
          eventId={modal.eventId}
          readerAccount={address}
          onClose={() => setModal({ type: "none" })}
        />
      )}
      {modal.type === "update" && (
        <UpdateEventModal
          event={modal.event}
          onClose={() => setModal({ type: "none" })}
          onSuccess={fetchEvents}
        />
      )}

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">Organizer Dashboard</h1>
            <p className="mt-1 text-sm font-mono text-zinc-500 dark:text-gray-400">
              {address?.substring(0, 6)}…{address?.slice(-4)}
            </p>
          </div>
          <Link
            href="/create-event"
            className="bg-[#FF5722] hover:bg-[#F4511E] text-white px-5 py-2 rounded-lg font-bold text-sm transition"
          >
            + New Event
          </Link>
        </div>

        {/* Summary stats */}
        {myEvents.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Events", value: myEvents.length },
              {
                label: "Active",
                value: myEvents.filter((e) => !e.is_canceled).length,
              },
              {
                label: "Tickets Sold",
                value: myEvents
                  .reduce((s, e) => s + Number(e.tickets_sold), 0)
                  .toString(),
              },
              {
                label: "Total Revenue",
                value: formatXLM(
                  myEvents.reduce(
                    (s, e) => s + e.tickets_sold * e.ticket_price,
                    BigInt(0)
                  )
                ),
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-lg shadow-zinc-900/5 dark:border-white/5 dark:bg-[#27272A] dark:shadow-none"
              >
                <p className="text-xl font-bold text-zinc-950 dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Feedback */}
        {actionMsg && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${actionMsg.startsWith("Error")
                ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                : "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
              }`}
          >
            {actionMsg}
            <button
              onClick={() => setActionMsg("")}
              className="ml-3 underline text-xs"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Events list */}
        {loading ? (
          <p className="py-12 text-center text-zinc-500 dark:text-gray-400">Loading events…</p>
        ) : error ? (
          <p className="text-red-400 text-center py-12">{error}</p>
        ) : myEvents.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-zinc-500 dark:text-gray-400">You haven&apos;t created any events yet.</p>
            <Link
              href="/create-event"
              className="inline-block bg-[#FF5722] hover:bg-[#F4511E] text-white px-5 py-2 rounded-lg font-bold text-sm transition"
            >
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onCancel={handleCancel}
                onClaim={handleClaim}
                onViewAttendees={(id) =>
                  setModal({ type: "attendees", eventId: id })
                }
                onUpdate={(e) => setModal({ type: "update", event: e })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
