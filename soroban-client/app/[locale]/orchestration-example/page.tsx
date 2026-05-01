"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import AnalyticsPageView from "@/components/AnalyticsPageView";
import Header from "@/components/Header";
import { useWallet } from "@/contexts/WalletContext";
import {
  createEvent,
  buyTickets,
  createListing,
  getActiveListings,
  getAllEvents,
  isEventManagerConfigured,
  isMarketplaceConfigured,
} from "@/lib/soroban";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const orchestrationSchema = z.object({
  eventTheme: z.string().min(1, "Event theme required"),
  ticketPrice: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative"),
  totalTickets: z.coerce
    .number({ invalid_type_error: "Tickets must be a number" })
    .int("Must be a positive integer")
    .positive("Must be a positive integer"),
  quantityToBuy: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .int("Must be a positive integer")
    .positive("Must be a positive integer"),
  listingPrice: z.coerce
    .number({ invalid_type_error: "Listing price must be a number" })
    .min(0, "Price cannot be negative"),
});

type OrchestrationFormData = z.infer<typeof orchestrationSchema>;

export default function OrchestrationExamplePage() {
  const router = useRouter();
  const { address, isInstalled, connect, providerName, signTransaction } =
    useWallet();
  const [step, setStep] = useState(0);
  const [eventId, setEventId] = useState<number | null>(null);
  const [ticketContract, setTicketContract] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrchestrationFormData>({
    resolver: zodResolver(orchestrationSchema),
    defaultValues: {
      eventTheme: "Multi-Contract Orchestration Demo",
      ticketPrice: 100,
      totalTickets: 10,
      quantityToBuy: 1,
      listingPrice: 150,
    },
  });

  const onSubmit = async (data: OrchestrationFormData) => {
    if (!address || !signTransaction) {
      addLog("Wallet not connected");
      return;
    }

    if (!isEventManagerConfigured()) {
      addLog("Event Manager contract not configured");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create Event
      addLog("Step 1: Creating event...");
      const createResult = await createEvent(
        {
          organizer: address,
          theme: data.eventTheme,
          eventType: "Demo",
          startTimeUnix: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          endTimeUnix: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
          ticketPrice: BigInt(data.ticketPrice),
          totalTickets: BigInt(data.totalTickets),
          paymentToken:
            "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC", // XLM
        },
        signTransaction,
      );
      addLog(`Event created with ID: ${createResult.returnValue?.value?.u32}`);
      const newEventId = createResult.returnValue?.value?.u32;
      setEventId(newEventId);
      setStep(1);

      // Get the event to find ticket contract
      const events = await getAllEvents();
      const event = events.find((e) => e.id === newEventId);
      if (event?.ticket_nft_addr) {
        setTicketContract(event.ticket_nft_addr);
        addLog(`Ticket NFT contract deployed: ${event.ticket_nft_addr}`);
      }

      // Step 2: Buy Tickets
      addLog("Step 2: Buying tickets...");
      await buyTickets(
        {
          buyer: address,
          eventId: newEventId,
          quantity: BigInt(data.quantityToBuy),
        },
        signTransaction,
      );
      addLog(`Bought ${data.quantityToBuy} tickets`);
      setStep(2);

      // Get token ID (assuming first token is 1)
      if (event?.ticket_nft_addr) {
        setTokenId(1n);
        addLog(`Token ID: 1`);
      }

      // Step 3: List on Marketplace (if configured)
      if (
        isMarketplaceConfigured() &&
        event?.ticket_nft_addr &&
        tokenId !== null
      ) {
        addLog("Step 3: Listing ticket on marketplace...");
        await createListing(
          {
            seller: address,
            ticketContract: event.ticket_nft_addr,
            tokenId: tokenId,
            price: BigInt(data.listingPrice),
          },
          signTransaction,
        );
        addLog(`Listed ticket for ${data.listingPrice} XLM`);
        setStep(3);

        // Check listings
        const listings = await getActiveListings();
        addLog(`Active listings: ${listings.length}`);
      } else {
        addLog("Marketplace not configured, skipping listing step");
        setStep(3);
      }

      addLog("Orchestration complete!");
    } catch (error) {
      addLog(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AnalyticsPageView page="orchestration-example" />
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Multi-Contract Orchestration Example
          </h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <p className="text-gray-600 mb-4">
              This example demonstrates calling functions across multiple
              Soroban contracts:
            </p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>
                <strong>Event Manager:</strong> Create events and purchase
                tickets
              </li>
              <li>
                <strong>Ticket Factory:</strong> Deploy ticket NFT contracts
                (called internally)
              </li>
              <li>
                <strong>Ticket NFT:</strong> Mint and manage ticket NFTs (called
                internally)
              </li>
              <li>
                <strong>Marketplace:</strong> List and trade tickets (optional)
              </li>
            </ul>
          </div>

          {!address ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
              <p className="text-yellow-800">
                Please connect your wallet to run the orchestration example.
              </p>
              <button
                onClick={connect}
                className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                Connect Wallet
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Configuration</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Theme
                    </label>
                    <input
                      {...register("eventTheme")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.eventTheme && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.eventTheme.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ticket Price (XLM)
                    </label>
                    <input
                      type="number"
                      {...register("ticketPrice")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.ticketPrice && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.ticketPrice.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Tickets
                    </label>
                    <input
                      type="number"
                      {...register("totalTickets")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.totalTickets && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.totalTickets.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity to Buy
                    </label>
                    <input
                      type="number"
                      {...register("quantityToBuy")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.quantityToBuy && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.quantityToBuy.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Listing Price (XLM)
                    </label>
                    <input
                      type="number"
                      {...register("listingPrice")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.listingPrice && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.listingPrice.message}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading
                    ? "Running Orchestration..."
                    : "Run Multi-Contract Orchestration"}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Progress</h2>
            <div className="space-y-2">
              <div
                className={`flex items-center ${step >= 0 ? "text-green-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full mr-2 ${step >= 0 ? "bg-green-600" : "bg-gray-400"}`}
                ></div>
                Connect Wallet
              </div>
              <div
                className={`flex items-center ${step >= 1 ? "text-green-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full mr-2 ${step >= 1 ? "bg-green-600" : "bg-gray-400"}`}
                ></div>
                Create Event (Event Manager → Ticket Factory → Ticket NFT)
              </div>
              <div
                className={`flex items-center ${step >= 2 ? "text-green-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full mr-2 ${step >= 2 ? "bg-green-600" : "bg-gray-400"}`}
                ></div>
                Buy Tickets (Event Manager → Ticket NFT)
              </div>
              <div
                className={`flex items-center ${step >= 3 ? "text-green-600" : "text-gray-400"}`}
              >
                <div
                  className={`w-4 h-4 rounded-full mr-2 ${step >= 3 ? "bg-green-600" : "bg-gray-400"}`}
                ></div>
                List on Marketplace (optional)
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Logs</h2>
            <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">
                  No logs yet. Run the orchestration to see the process.
                </p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <p key={index} className="text-sm font-mono">
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
