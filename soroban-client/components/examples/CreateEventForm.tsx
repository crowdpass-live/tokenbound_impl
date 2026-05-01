"use client";

import { useSoroban } from "@/contexts/SorobanContext";
import { useCreateEvent } from "@/hooks/useEventManager";
import { useWallet } from "@/contexts/WalletContext";
import type { CreateEventInput } from "../../sdk/src/types";
import { useState } from "react";

export function CreateEventForm() {
  const { sdk } = useSoroban();
  const { address, signTransaction } = useWallet();

  const [formData, setFormData] = useState({
    theme: "",
    eventType: "",
    startDate: "",
    endDate: "",
    ticketPrice: "",
    totalTickets: "",
    paymentToken: "",
  });

  const eventInput: CreateEventInput = {
    organizer: address || "",
    theme: formData.theme,
    eventType: formData.eventType,
    startDate: new Date(formData.startDate).getTime() / 1000,
    endDate: new Date(formData.endDate).getTime() / 1000,
    ticketPrice: BigInt(formData.ticketPrice || 0),
    totalTickets: BigInt(formData.totalTickets || 0),
    paymentToken: formData.paymentToken,
  };

  const { write, loading, error, isSuccess, reset } = useCreateEvent(
    sdk,
    eventInput,
    {
      signTransaction: signTransaction || (async (xdr) => xdr),
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }
    await write();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-green-800 font-semibold mb-2">
          Event Created Successfully!
        </h3>
        <button
          onClick={reset}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Create Another Event
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Create New Event</h2>

      <div>
        <label className="block text-sm font-medium mb-1">Event Theme</label>
        <input
          type="text"
          name="theme"
          value={formData.theme}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="Web3 Conference 2024"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Event Type</label>
        <input
          type="text"
          name="eventType"
          value={formData.eventType}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="Conference"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="datetime-local"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input
            type="datetime-local"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Ticket Price</label>
          <input
            type="number"
            name="ticketPrice"
            value={formData.ticketPrice}
            onChange={handleChange}
            required
            min="0"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Total Tickets
          </label>
          <input
            type="number"
            name="totalTickets"
            value={formData.totalTickets}
            onChange={handleChange}
            required
            min="1"
            className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
            placeholder="1000"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Payment Token Address
        </label>
        <input
          type="text"
          name="paymentToken"
          value={formData.paymentToken}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800">
          {error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !address}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {loading ? "Creating Event..." : "Create Event"}
      </button>

      {!address && (
        <p className="text-sm text-gray-600 text-center">
          Please connect your wallet to create an event
        </p>
      )}
    </form>
  );
}
