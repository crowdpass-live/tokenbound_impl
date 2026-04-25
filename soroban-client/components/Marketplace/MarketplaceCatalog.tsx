"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { trackMarketplacePurchase } from "@/lib/analytics";
import ListingCard from "./ListingCard";
import CreateListingForm from "./CreateListingForm";
import { getActiveListings, type Listing } from "@/lib/marketplace";

type FilterType = "all" | "my-listings" | "purchased";

export default function MarketplaceCatalog() {
  const { address, isConnected, isInstalled, connect } = useWallet();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [pendingListingId, setPendingListingId] = useState<number | null>(null);

  useEffect(() => {
    fetchListings();
  }, [filter, address]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let data: Listing[];

      switch (filter) {
        case "my-listings":
          if (!address) {
            data = [];
            break;
          }
          data = await getActiveListings(address);
          break;
        case "purchased":
          // Fetch user's purchased tickets
          data = await getPurchasedListings(address);
          break;
        default:
          data = await getActiveListings();
      }

      setListings(data);
    } catch (error) {
      console.error("Failed to fetch listings:", error);
      setStatus("Failed to load marketplace listings");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (listing: Listing) => {
    if (!isConnected) {
      if (!isInstalled) {
        setStatus("Install Freighter to purchase tickets.");
        return;
      }
      await connect();
    }

    setPendingListingId(listing.id);
    setStatus("");

    try {
      // Call marketplace purchase function
      const response = await fetch("/api/marketplace/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          buyerAddress: address,
          price: listing.price,
        }),
      });

      const result = await response.json();

      if (result.success) {
        trackMarketplacePurchase(listing.ticketContract, listing.tokenId, listing.price);
        setStatus(`Successfully purchased ticket #${listing.tokenId}! NFT has been transferred.`);
        fetchListings(); // Refresh listings
      } else {
        setStatus(result.error || "Purchase failed. Please try again.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ticket purchase failed.";
      setStatus(message);
    } finally {
      setPendingListingId(null);
    }
  };

  const handleCancelListing = async (listing: Listing) => {
    if (!isConnected || listing.seller !== address) return;

    try {
      const response = await fetch("/api/marketplace/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          sellerAddress: address,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setStatus(`Listing #${listing.id} cancelled successfully.`);
        fetchListings();
      } else {
        setStatus(result.error || "Failed to cancel listing.");
      }
    } catch (error) {
      setStatus("Failed to cancel listing. Please try again.");
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    fetchListings();
    setStatus("Your ticket has been listed for sale!");
  };

  return (
    <section className="space-y-6">
      {/* Filter and Create Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 rounded-2xl border border-zinc-200 bg-white p-1 dark:border-white/10 dark:bg-white/5">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${filter === "all"
                ? "bg-[#FF5722] text-white"
                : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
              }`}
          >
            All Listings
          </button>
          {!isConnected && (
            <>
              <button
                onClick={() => setFilter("my-listings")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${filter === "my-listings"
                    ? "bg-[#FF5722] text-white"
                    : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  }`}
              >
                My Listings
              </button>
              <button
                onClick={() => setFilter("purchased")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${filter === "purchased"
                    ? "bg-[#FF5722] text-white"
                    : "text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                  }`}
              >
                Purchased
              </button>
            </>
          )}
        </div>

        {isConnected && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-2xl bg-[#FF5722] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#F4511E]"
          >
            {showCreateForm ? "Cancel" : "+ List Ticket"}
          </button>
        )}
      </div>

      {/* Create Listing Form */}
      {showCreateForm && (
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-900/5 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <CreateListingForm onSuccess={handleCreateSuccess} />
        </div>
      )}

      {/* Listings Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="text-zinc-500 dark:text-zinc-400">Loading listings...</div>
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-[28px] border border-zinc-200 bg-white p-12 text-center shadow-lg shadow-zinc-900/5 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
          <p className="text-zinc-500 dark:text-zinc-400">
            {filter === "my-listings"
              ? "You haven't listed any tickets yet."
              : filter === "purchased"
                ? "You haven't purchased any tickets from the marketplace yet."
                : "No tickets available for resale at the moment."}
          </p>
          {filter === "all" && isConnected && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-4 text-[#FF5722] hover:underline"
            >
              Be the first to list a ticket!
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPurchase={() => handlePurchase(listing)}
              onCancel={() => handleCancelListing(listing)}
              isPending={pendingListingId === listing.id}
              currentUser={address}
            />
          ))}
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200">
          {status}
        </div>
      )}
    </section>
  );
}

// Helper function to get purchased listings
async function getPurchasedListings(userAddress: string | null): Promise<Listing[]> {
  if (!userAddress) return [];
  // In production, fetch from your contract
  return [];
}