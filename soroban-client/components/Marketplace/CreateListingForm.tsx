"use client";

import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";

interface CreateListingFormProps {
  onSuccess: () => void;
}

export default function CreateListingForm({ onSuccess }: CreateListingFormProps) {
  const { address } = useWallet();
  const [ticketContract, setTicketContract] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!ticketContract || !tokenId || !price) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/marketplace/create-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller: address,
          ticketContract,
          tokenId: parseInt(tokenId),
          price: parseFloat(price),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        onSuccess();
        setTicketContract("");
        setTokenId("");
        setPrice("");
      } else {
        setError(data.error || "Failed to create listing");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold text-white">List a Ticket for Resale</h3>
      <p className="text-sm text-zinc-400">
        List your ticket on the marketplace. All listings are subject to price caps to prevent scalping.
      </p>

      <div>
        <label htmlFor="ticketContract" className="block text-sm font-medium text-zinc-300 mb-2">
          Ticket Contract Address
        </label>
        <input
          id="ticketContract"
          type="text"
          value={ticketContract}
          onChange={(e) => setTicketContract(e.target.value)}
          placeholder="C..."
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-[#FF5722] focus:outline-none"
          required
        />
      </div>

      <div>
        <label htmlFor="tokenId" className="block text-sm font-medium text-zinc-300 mb-2">
          Token ID
        </label>
        <input
          id="tokenId"
          type="number"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="Enter token ID"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-[#FF5722] focus:outline-none"
          required
        />
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-zinc-300 mb-2">
          Asking Price (XLM)
        </label>
        <input
          id="price"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Enter price in XLM"
          className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-[#FF5722] focus:outline-none"
          required
        />
        <p className="mt-2 text-xs text-zinc-500">
          Price will be validated against market caps to prevent excessive pricing.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-[#FF5722] px-5 py-4 text-base font-semibold text-white transition hover:bg-[#F4511E] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating Listing..." : "List Ticket"}
      </button>
    </form>
  );
}