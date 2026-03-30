"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { useWallet } from "@/contexts/WalletContext";
import {
  getAllEvents,
  getTxExplorerUrl,
  isEventManagerConfigured,
  purchaseTickets,
  type Event,
  type SorobanSubmitResult,
} from "@/lib/soroban";
import { trackTicketPurchase } from "@/lib/analytics";

const STROOPS_PER_XLM = 10_000_000;

function formatDateTime(unix: number) {
  return new Date(unix * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatXlmFromStroops(stroops: bigint) {
  return (Number(stroops) / STROOPS_PER_XLM).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  });
}

function isLikelyNativeAsset(paymentToken: string) {
  return /^0+$/.test(paymentToken.replace(/^0x/i, ""));
}

function remainingTickets(e: Event) {
  const r = e.total_tickets - e.tickets_sold;
  return r > BigInt(0) ? r : BigInt(0);
}

type StatusFilter = "all" | "upcoming" | "canceled";

export default function EventCatalog() {
  const {
    address,
    isConnected,
    isInstalled,
    connect,
    providerName,
    signTransaction,
  } = useWallet();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Event | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [purchasePhase, setPurchasePhase] = useState<
    "idle" | "signing" | "confirming"
  >("idle");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
    tx?: SorobanSubmitResult;
  } | null>(null);

  const simulationHint =
    !isConnected &&
    typeof process.env.NEXT_PUBLIC_SOROBAN_SIM_SOURCE === "string" &&
    process.env.NEXT_PUBLIC_SOROBAN_SIM_SOURCE.length > 0;

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const source = address || undefined;
      const list = await getAllEvents(source ?? null);
      setEvents(list);
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Could not load events from the network.";
      setLoadError(msg);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const now = Date.now() / 1000;
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (statusFilter === "canceled" && !e.is_canceled) return false;
      if (statusFilter === "upcoming") {
        if (e.is_canceled) return false;
        if (Number(e.end_date) < now) return false;
      }
      if (!q) return true;
      return (
        e.theme.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q) ||
        String(e.id).includes(q)
      );
    });
  }, [events, query, statusFilter]);

  useEffect(() => {
    if (selected) {
      const max = Number(remainingTickets(selected));
      setQuantity((q) => Math.min(Math.max(1, q), Math.max(1, max)));
    }
  }, [selected]);

  const handlePurchase = async () => {
    if (!selected) return;
    const rem = remainingTickets(selected);
    if (rem <= BigInt(0) || selected.is_canceled) {
      setFeedback({
        type: "error",
        message: "This event has no tickets available.",
      });
      return;
    }

    if (!isConnected) {
      if (!isInstalled) {
        setFeedback({
          type: "error",
          message: `Install ${providerName} (or another supported wallet) to purchase tickets.`,
        });
        return;
      }
      try {
        await connect();
      } catch {
        return;
      }
    }

    const buyer = address || localStorage.getItem("wallet_address");
    if (!buyer) {
      setFeedback({ type: "error", message: "Connect your wallet to continue." });
      return;
    }

    if (!isEventManagerConfigured()) {
      setFeedback({
        type: "error",
        message:
          "Event manager contract is not configured. Set NEXT_PUBLIC_EVENT_MANAGER_CONTRACT.",
      });
      return;
    }

    const qty = BigInt(quantity);
    if (qty > rem) {
      setFeedback({
        type: "error",
        message: `Only ${rem.toString()} ticket(s) remaining.`,
      });
      return;
    }

    setPurchasePhase("signing");
    setFeedback(null);

    try {
      setPurchasePhase("confirming");
      const result = await purchaseTickets(
        { buyer, eventId: selected.id, quantity: qty },
        signTransaction
      );

      const unit = selected.ticket_price;
      const revenueStroops = unit * qty;
      trackTicketPurchase(
        selected.theme,
        quantity,
        Number(revenueStroops) / STROOPS_PER_XLM
      );

      setFeedback({
        type: "success",
        message: `Purchased ${quantity} ticket(s) for “${selected.theme}”.`,
        tx: result,
      });
      await refresh();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Ticket purchase failed.";
      setFeedback({ type: "error", message });
    } finally {
      setPurchasePhase("idle");
    }
  };

  const configured = isEventManagerConfigured();

  return (
    <div className="space-y-8">
      {!configured && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Set{" "}
          <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
            NEXT_PUBLIC_EVENT_MANAGER_CONTRACT
          </code>{" "}
          to your deployed EventManager contract id to enable purchases.
        </div>
      )}

      {simulationHint && (
        <p className="text-sm text-zinc-400">
          Listing uses{" "}
          <code className="rounded bg-white/10 px-1 text-xs">
            NEXT_PUBLIC_SOROBAN_SIM_SOURCE
          </code>{" "}
          for read simulation. Connect a wallet to use your address instead.
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-md">
          <label htmlFor="event-search" className="text-sm font-medium text-zinc-300">
            Search
          </label>
          <input
            id="event-search"
            type="search"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder="Name, type, or event id…"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["upcoming", "Upcoming"],
              ["canceled", "Canceled"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                statusFilter === key
                  ? "bg-[#FF5722] text-white"
                  : "border border-white/15 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-zinc-400">Loading events…</p>
      ) : loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-red-200">
          {loadError}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-zinc-400">
          {events.length === 0
            ? "No events returned. Create one from the dashboard or check your contract and simulation account."
            : "No events match your search or filters."}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => {
            const rem = remainingTickets(event);
            const soldOut = rem <= BigInt(0);
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(event);
                    setFeedback(null);
                  }}
                  className="flex h-full w-full flex-col rounded-[28px] border border-white/10 bg-white/5 p-6 text-left shadow-xl shadow-black/20 transition hover:border-sky-400/30 hover:bg-white/[0.07]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-orange-200/70">
                        Event #{event.id}
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-white">
                        {event.theme}
                      </h2>
                    </div>
                    {event.is_canceled ? (
                      <span className="shrink-0 rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-200">
                        Canceled
                      </span>
                    ) : soldOut ? (
                      <span className="shrink-0 rounded-full bg-zinc-500/20 px-3 py-1 text-xs text-zinc-300">
                        Sold out
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
                        {rem.toString()} left
                      </span>
                    )}
                  </div>
                  {event.event_type ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">
                      {event.event_type}
                    </p>
                  ) : null}
                  <dl className="mt-4 space-y-2 text-sm text-zinc-300">
                    <div className="flex justify-between gap-2">
                      <dt>Starts</dt>
                      <dd>{formatDateTime(event.start_date)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>Price</dt>
                      <dd>
                        {formatXlmFromStroops(event.ticket_price)}{" "}
                        {isLikelyNativeAsset(event.payment_token) ? "XLM" : "units"}
                      </dd>
                    </div>
                  </dl>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {feedback && !selected && (
        <div
          className={`rounded-2xl border px-4 py-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-red-500/30 bg-red-500/10 text-red-100"
          }`}
        >
          <p>{feedback.message}</p>
          {feedback.tx && (
            <div className="mt-3 space-y-1 font-mono text-xs text-zinc-300">
              <p>
                Hash:{" "}
                <a
                  href={getTxExplorerUrl(feedback.tx.hash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-300 underline hover:text-sky-200"
                >
                  {feedback.tx.hash}
                </a>
              </p>
              <p>Ledger: {feedback.tx.ledger}</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-detail-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#1f1f23] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-orange-200/70">
                  Event #{selected.id}
                </p>
                <h2
                  id="event-detail-title"
                  className="mt-2 text-2xl font-semibold text-white"
                >
                  {selected.theme}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setFeedback(null);
                }}
                className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>

            {selected.event_type ? (
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                {selected.event_type}
              </p>
            ) : null}

            <dl className="mt-6 space-y-3 text-sm text-zinc-300">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Start</dt>
                <dd>{formatDateTime(selected.start_date)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">End</dt>
                <dd>{formatDateTime(selected.end_date)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Ticket price</dt>
                <dd>
                  {formatXlmFromStroops(selected.ticket_price)}{" "}
                  {isLikelyNativeAsset(selected.payment_token) ? "XLM" : "token base units"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Tickets remaining</dt>
                <dd>{remainingTickets(selected).toString()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Organizer</dt>
                <dd className="max-w-[60%] truncate font-mono text-xs text-zinc-400">
                  {selected.organizer}
                </dd>
              </div>
            </dl>

            {selected.is_canceled ? (
              <p className="mt-6 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
                This event was canceled. Purchases are disabled.
              </p>
            ) : remainingTickets(selected) <= BigInt(0) ? (
              <p className="mt-6 rounded-2xl bg-zinc-500/10 px-4 py-3 text-sm text-zinc-300">
                Sold out.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="purchase-qty"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Quantity
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-xl text-white hover:bg-white/10"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <input
                      id="purchase-qty"
                      type="number"
                      min={1}
                      max={Number(remainingTickets(selected))}
                      value={quantity}
                      onChange={(ev) =>
                        setQuantity(
                          Math.max(
                            1,
                            Math.min(
                              Number(remainingTickets(selected)),
                              Number(ev.target.value) || 1
                            )
                          )
                        )
                      }
                      className="h-11 w-24 rounded-2xl border border-white/10 bg-zinc-950 text-center text-white"
                    />
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-xl text-white hover:bg-white/10"
                      onClick={() =>
                        setQuantity((q) =>
                          Math.min(
                            Number(remainingTickets(selected)),
                            q + 1
                          )
                        )
                      }
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {feedback && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      feedback.type === "success"
                        ? "bg-emerald-500/15 text-emerald-100"
                        : "bg-red-500/15 text-red-100"
                    }`}
                  >
                    <p>{feedback.message}</p>
                    {feedback.tx && (
                      <div className="mt-2 space-y-1 font-mono text-xs opacity-90">
                        <p>
                          <a
                            href={getTxExplorerUrl(feedback.tx.hash)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-300 underline"
                          >
                            View transaction
                          </a>
                        </p>
                        <p>Ledger {feedback.tx.ledger}</p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handlePurchase()}
                  disabled={
                    purchasePhase !== "idle" ||
                    !configured ||
                    selected.is_canceled
                  }
                  className="w-full rounded-2xl bg-[#FF5722] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#F4511E] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {purchasePhase === "signing"
                    ? "Approve in wallet…"
                    : purchasePhase === "confirming"
                      ? "Confirming on network…"
                      : !isConnected
                        ? `Connect & purchase`
                        : "Purchase tickets"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
