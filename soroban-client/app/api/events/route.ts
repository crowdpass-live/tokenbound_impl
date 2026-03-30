/**
 * GET /api/events
 *
 * Query indexed contract events.
 *
 * Query params:
 *   organizer  – filter by organizer address (hex)
 *   status     – "active" | "canceled" | "completed"
 *   type       – ContractEventType (e.g. "EventCreated")
 *   from       – unix timestamp (seconds)
 *   to         – unix timestamp (seconds)
 *   limit      – max results (default 50, max 200)
 *   offset     – pagination offset (default 0)
 */

import { NextRequest, NextResponse } from "next/server";
import { queryEvents, getCacheStats, type ContractEventType } from "@/lib/indexer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  try {
    const result = await queryEvents({
      organizer: sp.get("organizer") ?? undefined,
      status: (sp.get("status") as "active" | "canceled" | "completed") ?? undefined,
      type: (sp.get("type") as ContractEventType) ?? undefined,
      from: sp.get("from") ? Number(sp.get("from")) : undefined,
      to: sp.get("to") ? Number(sp.get("to")) : undefined,
      limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
      offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
    });

    return NextResponse.json({
      ...result,
      cache: getCacheStats(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
