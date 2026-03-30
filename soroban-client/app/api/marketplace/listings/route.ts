// app/api/marketplace/listings/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const seller = searchParams.get("seller");
    
    // TODO: Replace with actual contract calls
    const mockListings = [
      {
        id: 1,
        seller: "GA2C...",
        ticketContract: "CA3F...",
        tokenId: 101,
        price: 100,
        active: true,
        createdAt: Math.floor(Date.now() / 1000) - 86400,
        eventTitle: "Soroban Summit",
        eventDate: "Apr 18, 2026",
      },
      // Add more mock listings
    ];
    
    const filtered = seller 
      ? mockListings.filter(l => l.seller === seller)
      : mockListings;
    
    return NextResponse.json(filtered);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}
