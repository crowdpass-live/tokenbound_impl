"use client";

import { SorobanProvider } from "@/contexts/SorobanContext";
import { EventList } from "@/components/examples/EventList";
import { CreateEventForm } from "@/components/examples/CreateEventForm";
import { PurchaseTicket } from "@/components/examples/PurchaseTicket";
import { TBAManager } from "@/components/examples/TBAManager";
import { useState } from "react";

const sorobanConfig = {
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL ||
    "https://horizon-testnet.stellar.org",
  sorobanRpcUrl:
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
    "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
  contracts: {
    eventManager: process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT || "",
    ticketFactory: process.env.NEXT_PUBLIC_TICKET_FACTORY_CONTRACT || "",
    ticketNft: process.env.NEXT_PUBLIC_TICKET_NFT_CONTRACT || "",
    tbaRegistry: process.env.NEXT_PUBLIC_TBA_REGISTRY_CONTRACT || "",
    tbaAccount: process.env.NEXT_PUBLIC_TBA_ACCOUNT_CONTRACT || "",
  },
};

export default function SorobanIntegrationPage() {
  const [activeTab, setActiveTab] = useState<
    "events" | "create" | "purchase" | "tba"
  >("events");
  const [selectedEventId, setSelectedEventId] = useState(1);

  return (
    <SorobanProvider config={sorobanConfig}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              Soroban Contract Integration
            </h1>
            <p className="text-gray-600">
              Practical demonstration of Soroban contract interactions in React
            </p>
          </header>

          <div className="mb-6 border-b">
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab("events")}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === "events"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Event List
              </button>
              <button
                onClick={() => setActiveTab("create")}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === "create"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Create Event
              </button>
              <button
                onClick={() => setActiveTab("purchase")}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === "purchase"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Purchase Ticket
              </button>
              <button
                onClick={() => setActiveTab("tba")}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === "tba"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                TBA Manager
              </button>
            </nav>
          </div>

          <main className="bg-white rounded-lg shadow-sm p-6">
            {activeTab === "events" && <EventList />}
            {activeTab === "create" && <CreateEventForm />}
            {activeTab === "purchase" && (
              <div className="space-y-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Event ID
                  </label>
                  <input
                    type="number"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(Number(e.target.value))}
                    className="px-3 py-2 border rounded"
                    min="1"
                  />
                </div>
                <PurchaseTicket eventId={selectedEventId} />
              </div>
            )}
            {activeTab === "tba" && (
              <TBAManager
                tokenContract="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                tokenId={1n}
              />
            )}
          </main>

          <footer className="mt-8 text-center text-sm text-gray-600">
            <p>
              This page demonstrates React hooks for Soroban contract
              interactions with state management and real-time UI updates.
            </p>
          </footer>
        </div>
      </div>
    </SorobanProvider>
  );
}
