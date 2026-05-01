"use client";

import { SorobanProvider } from "@/contexts/SorobanContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { NFT721Demo } from "@/components/examples/NFT721Demo";

const sorobanConfig = {
  horizonUrl:
    process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org",
  sorobanRpcUrl:
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
    "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
  contracts: {
    ticketNft: process.env.NEXT_PUBLIC_TICKET_NFT_CONTRACT || "",
  },
};

export default function NFT721Page() {
  return (
    <WalletProvider>
      <SorobanProvider config={sorobanConfig}>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold mb-2">ERC-721 NFT Demo</h1>
              <p className="text-gray-600">
                Interact with the <strong>TicketNFT</strong> Soroban contract — an
                ERC-721 compliant NFT deployed on Stellar testnet.
              </p>
            </header>

            <main className="bg-white rounded-lg shadow-sm p-6">
              <NFT721Demo />
            </main>

            <footer className="mt-6 text-xs text-gray-500 text-center">
              Set <code>NEXT_PUBLIC_TICKET_NFT_CONTRACT</code> in{" "}
              <code>.env.local</code> to point at your deployed contract.
            </footer>
          </div>
        </div>
      </SorobanProvider>
    </WalletProvider>
  );
}
