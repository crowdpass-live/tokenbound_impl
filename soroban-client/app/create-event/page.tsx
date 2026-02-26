"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import { createEvent } from "@/lib/soroban";

export default function CreateEventPage() {
  const router = useRouter();
  const { address, isConnected, isInstalled, connect } = useWallet();

  const [theme, setTheme] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");
  const [tickets, setTickets] = useState("");
  const [image, setImage] = useState<File | null>(null);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const validate = () => {
    const errs: { [key: string]: string } = {};
    const now = Date.now();

    if (!theme.trim()) errs.theme = "Event name required";
    if (!startDate) errs.startDate = "Start date is required";
    if (!endDate) errs.endDate = "End date is required";
    if (startDate && new Date(startDate).getTime() <= now)
      errs.startDate = "Start date must be in the future";
    if (startDate && endDate && new Date(endDate) <= new Date(startDate))
      errs.endDate = "End date must be after start date";
    if (!price) errs.price = "Price required";
    if (price && isNaN(Number(price))) errs.price = "Price must be a number";
    if (price && Number(price) < 0) errs.price = "Price cannot be negative";
    if (!tickets) errs.tickets = "Total tickets required";
    if (tickets && (!/^[0-9]+$/.test(tickets) || Number(tickets) <= 0))
      errs.tickets = "Must be a positive integer";

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      if (isInstalled) {
        await connect();
      } else {
        alert("Please install Freighter to create an event.");
        return;
      }
    }
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const organizer = address!;
      const startUnix = Math.floor(new Date(startDate).getTime() / 1000);
      const endUnix = Math.floor(new Date(endDate).getTime() / 1000);
      const ticketPrice = BigInt(Math.floor(parseFloat(price) * 1_000_000));
      const totalTickets = BigInt(tickets);

      // for simplicity we use zero address as payment token; replace with real
      // token contract address or allow user selection later.
      const paymentToken = "0000000000000000000000000000000000000000000000000000000000000000";

      const res = await createEvent({
        organizer,
        theme,
        eventType: description,
        startTimeUnix: startUnix,
        endTimeUnix: endUnix,
        ticketPrice,
        totalTickets,
        paymentToken,
      });

      console.log("transaction result", res);
      setSuccessMsg("Event created (tx " + res.hash + ")");
      // Optionally redirect to dashboard or home after creation
      setTimeout(() => router.push("/"), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create Event</h1>

      {successMsg && (
        <div className="bg-green-100 text-green-800 p-2 mb-4">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="bg-red-100 text-red-800 p-2 mb-4">{errorMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Event Name
          </label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
          {errors.theme && (
            <p className="text-red-600 text-sm">{errors.theme}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start Date &amp; Time
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
          {errors.startDate && (
            <p className="text-red-600 text-sm">{errors.startDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            End Date &amp; Time
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
          {errors.endDate && (
            <p className="text-red-600 text-sm">{errors.endDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Ticket Price (XLM)
          </label>
          <input
            type="number"
            step="0.000001"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
          {errors.price && (
            <p className="text-red-600 text-sm">{errors.price}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Total Tickets
          </label>
          <input
            type="number"
            value={tickets}
            onChange={(e) => setTickets(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
          {errors.tickets && (
            <p className="text-red-600 text-sm">{errors.tickets}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Event Image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Event"}
        </button>
      </form>
    </div>
  );
}
