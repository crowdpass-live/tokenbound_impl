"use client";

import React, { useEffect, useState, useCallback } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useWallet } from "@/contexts/WalletContext";
import { type Event, getUserTickets } from "@/lib/soroban";
import TicketQRModal from "@/components/TicketQRModal";

export default function MyTicketsPage() {
  const { address, isConnected, isInstalled, connect } = useWallet();
  const [tickets, setTickets] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Event | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const ts = await getUserTickets(address);
      setTickets(ts);
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      fetchTickets();
    }
  }, [isConnected, address, fetchTickets]);

  const formatDate = (unix: number) => new Date(unix * 1000).toLocaleString();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background text-foreground selection:bg-sky-500/30">
        <Header />
        <main className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center h-screen px-4">
          <div className="flex flex-col items-center text-center space-y-6 max-w-lg">
            <div className="p-4 bg-sky-500/10 rounded-3xl border border-sky-500/20 text-sky-400">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">Your Ticket Wallet is Private</h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400">Connect your wallet to see all your event tickets and access your entry codes.</p>
            <button
              onClick={() => isInstalled ? connect() : alert("Please install Freighter.")}
              className="rounded-2xl bg-sky-500 px-8 py-4 font-bold text-white shadow-lg transition hover:bg-sky-400 active:scale-95"
            >
              Connect Wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-sky-500/30">
      <Header />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-20 pt-36 sm:px-6">
        <section className="rounded-[32px] border border-zinc-200 bg-white/90 p-8 shadow-lg shadow-zinc-900/5 dark:border-white/10 dark:bg-zinc-900/50 dark:ring-1 dark:ring-white/5 dark:shadow-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.4em] text-sky-400 font-bold">My Wallet</p>
              <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-5xl">Your Field Access</h1>
              <p className="max-w-xl text-zinc-500 dark:text-zinc-400">
                Manage your on-chain event tickets, view details, and generate verification QR codes for entry.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 rounded-3xl border border-zinc-200 bg-zinc-50 p-6 dark:border-white/10 dark:bg-white/5">
              <span className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Connected As</span>
              <span className="text-sky-300 font-mono text-sm tracking-tight">{address?.substring(0, 10)}...{address?.slice(-10)}</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-24 space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-600">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="m4.93 4.93 14.14 14.14" /><path d="m4.93 19.07 14.14-14.14" /></svg>
            </div>
            <p className="text-xl font-medium italic text-zinc-500 dark:text-zinc-400">Your ticket history is currently empty.</p>
            <Link
              href="/events"
              className="inline-block rounded-2xl border border-zinc-300 px-8 py-3 font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="group relative flex flex-col overflow-hidden rounded-[32px] border border-zinc-200 bg-white p-1 shadow-md shadow-zinc-900/5 transition-all hover:border-sky-500/40 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/40 dark:shadow-black/20 dark:hover:bg-zinc-900/80"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

                <div className="flex flex-col h-full space-y-4 p-7 z-10">
                  <div className="flex items-start justify-between">
                    <div className="rounded-2xl bg-zinc-100 p-3 transition duration-500 group-hover:bg-sky-500/10 dark:bg-zinc-800">
                      <svg width="24" height="24" className="text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" /></svg>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-sky-300 bg-sky-500/10 px-2 py-1 rounded-full">ACTIVE</span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-white">{ticket.theme}</h3>
                    <p className="text-sm font-medium text-zinc-500">#{ticket.id} • {ticket.event_type}</p>
                  </div>

                  <div className="space-y-3 border-t border-zinc-200 pt-2 text-sm text-zinc-500 dark:border-white/5 dark:text-zinc-400">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                      {formatDate(ticket.start_date)}
                    </div>
                  </div>

                  <div className="pt-4 mt-auto">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="w-full rounded-2xl bg-zinc-900 py-4 font-bold text-white transition hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/20 dark:bg-zinc-800"
                    >
                      View Ticket QR
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedTicket && address && (
        <TicketQRModal
          event={selectedTicket}
          address={address}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
