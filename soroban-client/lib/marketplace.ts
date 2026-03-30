import { SorobanClient } from "./soroban";

export interface Listing {
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

export interface Sale {
  buyer: string;
  seller: string;
  ticketContract: string;
  tokenId: number;
  price: number;
  timestamp: number;
}

// Mock data for now - replace with actual contract calls
export async function getActiveListings(seller?: string | null): Promise<Listing[]> {
  // This will be replaced with actual contract calls
  const mockListings: Listing[] = [
    {
      id: 1,
      seller: "GA2C3D...",
      ticketContract: "CA3F8A...",
      tokenId: 101,
      price: 100,
      active: true,
      createdAt: Math.floor(Date.now() / 1000) - 86400,
      eventTitle: "Soroban Summit",
      eventDate: "Apr 18, 2026",
    },
    {
      id: 2,
      seller: "GB7X9Y...",
      ticketContract: "CA3F8A...",
      tokenId: 102,
      price: 150,
      active: true,
      createdAt: Math.floor(Date.now() / 1000) - 43200,
      eventTitle: "Builder House",
      eventDate: "May 02, 2026",
    },
  ];

  if (seller) {
    return mockListings.filter(l => l.seller === seller);
  }
  return mockListings;
}

export async function createListing(
  seller: string,
  ticketContract: string,
  tokenId: number,
  price: number
): Promise<number> {
  // This will call the marketplace contract
  console.log("Creating listing:", { seller, ticketContract, tokenId, price });
  return Date.now(); // Return listing ID
}

export async function purchaseListing(
  listingId: number,
  buyer: string,
  price: number
): Promise<void> {
  // This will call the marketplace contract
  console.log("Purchasing listing:", { listingId, buyer, price });
}

export async function cancelListing(listingId: number, seller: string): Promise<void> {
  // This will call the marketplace contract
  console.log("Cancelling listing:", { listingId, seller });
}