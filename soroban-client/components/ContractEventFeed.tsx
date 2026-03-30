"use client";

import { useState } from "react";
import { useContractEvents } from "@/hooks/useContractEvents";
import type { ContractEventType } from "@/lib/indexer";

const EVENT_TYPE_LABELS: Record<ContractEventType, string> = {
  EventCreated: "Created",
  TicketPurchased: "Purchase",
  EventCanceled: "Canceled",
  FundsWithdrawn: "Withdrawn",
  EventUpdated: "Updated",
};

const STATUS_COLORS = {
  active: "text-green-400",
  canceled: "text-red-400",
  completed: "text-blue-400",
};

const TYPE_COLORS: Record<ContractEventType, string> = {
  EventCreated: "bg-green-500/20 text-green-300",
  TicketPurchased: "bg-sky-500/20 text-sky-300",
  EventCanceled: "bg-red-500/20 text-red-300",
  FundsWithdrawn: "bg-yellow-500/20 text-yellow-300",
  EventUpdated: "bg-purple-500/20 text-purple-300",
};

export default function ContractEventFeed() {
  const [statusFilter, setStatusFilter] = useState<
    "active" | "canceled" | "completed" | ""
  >("");
  const [typeFilter, setTypeFilter] = useState<ContractEventType | "">("");

  const { events, total, loading, error, updatedAt, refetch } = useContractEvents({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    limit: 50,
    realtime: true,
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Contract Event Feed</h2>
          <p className="text-xs text-zinc-400">
            {total} events indexed
            {updatedAt > 0 && (
              <> · updated {new Date(updatedAt).toLocaleTimeString()}</>
            )}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
            className="rounded-lg border border-white/10 bg-[#2a2a2a] px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="canceled">Canceled</option>
            <option value="completed">Completed</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as typeof typeFilter)
            }
            className="rounded-lg border border-white/10 bg-[#2a2a2a] px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="">All types</option>
            {(Object.keys(EVENT_TYPE_LABELS) as ContractEventType[]).map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          <button
            onClick={refetch}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          Loading contract events…
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center text-sm text-zinc-500">
          No events found. Make sure{" "}
          <code className="text-zinc-300">NEXT_PUBLIC_EVENT_MANAGER_CONTRACT</code> is
          configured.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Event ID</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Ledger</th>
                <th className="pb-3 pr-4">Time</th>
                <th className="pb-3">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {events.map((ev) => (
                <tr key={ev.id} className="text-zinc-300 hover:bg-white/5">
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[ev.type]}`}
                    >
                      {EVENT_TYPE_LABELS[ev.type]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">
                    {ev.eventId ?? "—"}
                  </td>
                  <td className={`py-3 pr-4 text-xs font-medium ${STATUS_COLORS[ev.status]}`}>
                    {ev.status}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">{ev.ledger}</td>
                  <td className="py-3 pr-4 text-xs text-zinc-400">
                    {new Date(ev.ledgerClosedAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${ev.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-sky-400 hover:underline"
                    >
                      {ev.txHash.slice(0, 8)}…
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
