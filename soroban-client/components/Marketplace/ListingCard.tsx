"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface Listing {
  id: number;
  seller: string;
  ticketContract: string;
  tokenId: number;
  price: number;
  active: boolean;
  createdAt: number;
  eventTitle?: string;
  eventDate?: string;
}

interface ListingCardProps {
  listing: Listing;
  onPurchase: () => void;
  onCancel?: () => void;
  isPending: boolean;
  currentUser: string | null;
}

export default function ListingCard({
  listing,
  onPurchase,
  onCancel,
  isPending,
  currentUser,
}: ListingCardProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isOwner = currentUser === listing.seller;

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-orange-200/70">
            Ticket #{listing.tokenId}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {listing.eventTitle || "Event Ticket"}
          </h2>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
          {listing.price} XLM
        </span>
      </div>

      {listing.eventDate && (
        <p className="mt-2 text-sm text-zinc-400">{listing.eventDate}</p>
      )}

      <dl className="mt-6 space-y-3 text-sm text-zinc-300">
        <div className="flex items-center justify-between">
          <dt>Seller</dt>
          <dd className="font-mono">{formatAddress(listing.seller)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Contract</dt>
          <dd className="font-mono text-xs">
            {formatAddress(listing.ticketContract)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Listed</dt>
          <dd>{formatDate(listing.createdAt)}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-300">Price</span>
          <span className="text-xl font-bold text-white">{listing.price} XLM</span>
        </div>
        {listing.price > 0 && (
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-orange-200/80">
            Price cap enforced
          </p>
        )}
      </div>

      {isOwner && onCancel ? (
        <>
          {!showCancelConfirm ? (
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-base font-semibold text-red-400 transition hover:bg-red-500/20"
            >
              <Trash2 size={18} />
              Cancel Listing
            </button>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="text-center text-sm text-zinc-400">
                Are you sure you want to cancel this listing?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  Keep
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 rounded-2xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Cancel Listing
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={onPurchase}
          disabled={isPending}
          className="mt-6 w-full rounded-2xl bg-[#FF5722] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#F4511E] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Processing..." : "Purchase Ticket"}
        </button>
      )}
    </article>
  );
}