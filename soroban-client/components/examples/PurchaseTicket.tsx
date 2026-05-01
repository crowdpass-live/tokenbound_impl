"use client";

import { useState } from "react";
import { useSoroban } from "@/contexts/SorobanContext";
import { usePurchaseTicket, useGetEvent } from "@/hooks/useEventManager";
import { useWallet } from "@/contexts/WalletContext";

interface PurchaseTicketProps {
  eventId: number;
}

export function PurchaseTicket({ eventId }: PurchaseTicketProps) {
  const { sdk } = useSoroban();
  const { address, signTransaction } = useWallet();
  const [tierIndex, setTierIndex] = useState(0);

  const { data: event, loading: eventLoading } = useGetEvent(sdk, eventId, {
    enabled: true,
  });

  const { write, loading, error, isSuccess, reset } = usePurchaseTicket(
    sdk,
    {
      buyer: address || "",
      eventId,
      tierIndex,
    },
    {
      signTransaction: signTransaction || (async (xdr) => xdr),
    },
  );

  const handlePurchase = async () => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }
    await write();
  };

  if (eventLoading) {
    return <div className="text-center p-4">Loading event details...</div>;
  }

  if (!event) {
    return <div className="text-center p-4 text-red-600">Event not found</div>;
  }

  if (event.isCanceled) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">This event has been canceled</p>
      </div>
    );
  }

  const soldOut = event.ticketsSold >= event.totalTickets;

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-green-800 font-semibold mb-2">
          Ticket Purchased Successfully!
        </h3>
        <p className="text-green-700 mb-4">
          Your ticket has been minted to your wallet.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Purchase Another Ticket
        </button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 max-w-md">
      <h3 className="text-xl font-bold mb-4">Purchase Ticket</h3>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Event:</span>
          <span className="font-medium">{event.theme}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Price:</span>
          <span className="font-medium">
            {event.ticketPrice.toString()} tokens
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Available:</span>
          <span className="font-medium">
            {(event.totalTickets - event.ticketsSold).toString()} /{" "}
            {event.totalTickets.toString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span className="font-medium">
            {new Date(event.startDate * 1000).toLocaleDateString()}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 mb-4">
          {error.message}
        </div>
      )}

      <button
        onClick={handlePurchase}
        disabled={loading || !address || soldOut}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? "Processing..." : soldOut ? "Sold Out" : "Purchase Ticket"}
      </button>

      {!address && (
        <p className="text-sm text-gray-600 text-center mt-3">
          Please connect your wallet to purchase
        </p>
      )}
    </div>
  );
}
