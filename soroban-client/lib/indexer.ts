/**
 * Contract Event Indexer
 *
 * Polls Horizon for contract events emitted by the EventManager contract,
 * stores them in an in-memory cache, and exposes helpers used by API routes.
 */

import { env } from "@/lib/env";

export type ContractEventType =
  | "EventCreated"
  | "TicketPurchased"
  | "EventCanceled"
  | "FundsWithdrawn"
  | "EventUpdated";

export interface IndexedEvent {
  id: string;           // "<ledger>-<txIndex>-<opIndex>-<eventIndex>"
  type: ContractEventType;
  ledger: number;
  ledgerClosedAt: string; // ISO timestamp
  txHash: string;
  contractId: string;
  // Decoded payload fields
  eventId?: number;
  organizer?: string;
  buyer?: string;
  ticketPrice?: string;
  totalTickets?: number;
  ticketsSold?: number;
  theme?: string;
  startDate?: number;
  endDate?: number;
  status: "active" | "canceled" | "completed";
}

interface Cache {
  events: IndexedEvent[];
  lastLedger: number;
  updatedAt: number; // epoch ms
}

// Module-level singleton cache (survives across requests in the same Node process)
const cache: Cache = {
  events: [],
  lastLedger: 0,
  updatedAt: 0,
};

const CACHE_TTL_MS = 15_000; // re-poll every 15 s

// ── Horizon response shapes (minimal) ────────────────────────────────────────

interface HorizonEventValue {
  type: string;
  value: string; // base64 XDR
}

interface HorizonContractEvent {
  id: string;
  ledger: number;
  ledger_closed_at: string;
  transaction_hash: string;
  contract_id: string;
  type: string;
  topic: HorizonEventValue[];
  value: HorizonEventValue;
}

interface HorizonEventsResponse {
  _embedded: { records: HorizonContractEvent[] };
  _links: { next?: { href: string } };
}

// ── XDR helpers ──────────────────────────────────────────────────────────────

function decodeSymbol(b64: string): string {
  try {
    const buf = Buffer.from(b64, "base64");
    // ScVal symbol: 4-byte type tag (0x00000006) + 4-byte length + bytes
    if (buf.length > 8) return buf.slice(8).toString("utf8");
    return buf.toString("utf8");
  } catch {
    return "";
  }
}

function decodeU32(b64: string): number {
  try {
    const buf = Buffer.from(b64, "base64");
    return buf.readUInt32BE(buf.length - 4);
  } catch {
    return 0;
  }
}

function decodeAddress(b64: string): string {
  try {
    const buf = Buffer.from(b64, "base64");
    // Return hex representation as a stable identifier
    return buf.toString("hex");
  } catch {
    return "";
  }
}

function decodeI128(b64: string): string {
  try {
    const buf = Buffer.from(b64, "base64");
    const hi = buf.readBigInt64BE(buf.length - 16);
    const lo = buf.readBigUInt64BE(buf.length - 8);
    return ((hi << BigInt(64)) | lo).toString();
  } catch {
    return "0";
  }
}

// ── Event decoder ─────────────────────────────────────────────────────────────

function decodeEvent(raw: HorizonContractEvent): IndexedEvent | null {
  if (!raw.topic || raw.topic.length === 0) return null;

  const eventType = decodeSymbol(raw.topic[0]?.value ?? "") as ContractEventType;
  const knownTypes: ContractEventType[] = [
    "EventCreated",
    "TicketPurchased",
    "EventCanceled",
    "FundsWithdrawn",
    "EventUpdated",
  ];
  if (!knownTypes.includes(eventType)) return null;

  const base: IndexedEvent = {
    id: raw.id,
    type: eventType,
    ledger: raw.ledger,
    ledgerClosedAt: raw.ledger_closed_at,
    txHash: raw.transaction_hash,
    contractId: raw.contract_id,
    status: "active",
  };

  // topic[1] is typically the event_id (u32)
  if (raw.topic[1]) base.eventId = decodeU32(raw.topic[1].value);

  // value contains the main payload map — decode known fields by event type
  switch (eventType) {
    case "EventCreated":
      if (raw.topic[2]) base.organizer = decodeAddress(raw.topic[2].value);
      base.ticketPrice = decodeI128(raw.value.value);
      break;
    case "TicketPurchased":
      if (raw.topic[2]) base.buyer = decodeAddress(raw.topic[2].value);
      break;
    case "EventCanceled":
      base.status = "canceled";
      if (raw.topic[2]) base.organizer = decodeAddress(raw.topic[2].value);
      break;
    case "FundsWithdrawn":
      if (raw.topic[2]) base.organizer = decodeAddress(raw.topic[2].value);
      break;
    case "EventUpdated":
      if (raw.topic[2]) base.organizer = decodeAddress(raw.topic[2].value);
      break;
  }

  return base;
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<HorizonEventsResponse> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`Horizon error ${res.status}: ${await res.text()}`);
  return res.json() as Promise<HorizonEventsResponse>;
}

async function pollHorizon(): Promise<void> {
  const contractId = env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT;
  if (!contractId || contractId === "<MISSING_CONTRACT_ID>") return;

  const base = `${env.NEXT_PUBLIC_HORIZON_URL}/contract_events`;
  const params = new URLSearchParams({
    contract_id: contractId,
    order: "asc",
    limit: "200",
    ...(cache.lastLedger > 0 ? { cursor: `${cache.lastLedger}-0-0-0` } : {}),
  });

  let url: string | undefined = `${base}?${params}`;
  const newEvents: IndexedEvent[] = [];

  while (url) {
    const page = await fetchPage(url);
    for (const raw of page._embedded.records) {
      const decoded = decodeEvent(raw);
      if (decoded) {
        newEvents.push(decoded);
        if (decoded.ledger > cache.lastLedger) cache.lastLedger = decoded.ledger;
      }
    }
    url = page._links.next?.href;
    // Stop paginating if we got a partial page (no more data)
    if (page._embedded.records.length < 200) break;
  }

  if (newEvents.length > 0) {
    // Merge: deduplicate by id, apply status updates
    const existingIds = new Set(cache.events.map((e) => e.id));
    for (const ev of newEvents) {
      if (!existingIds.has(ev.id)) {
        cache.events.push(ev);
      }
    }
    // Apply cancellation status retroactively
    const canceledIds = new Set(
      cache.events.filter((e) => e.type === "EventCanceled").map((e) => e.eventId)
    );
    for (const ev of cache.events) {
      if (ev.eventId !== undefined && canceledIds.has(ev.eventId)) {
        ev.status = "canceled";
      }
    }
  }

  cache.updatedAt = Date.now();
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getIndexedEvents(): Promise<IndexedEvent[]> {
  if (Date.now() - cache.updatedAt > CACHE_TTL_MS) {
    await pollHorizon();
  }
  return cache.events;
}

export interface EventQueryParams {
  organizer?: string;
  status?: "active" | "canceled" | "completed";
  from?: number;   // unix timestamp
  to?: number;     // unix timestamp
  type?: ContractEventType;
  limit?: number;
  offset?: number;
}

export async function queryEvents(params: EventQueryParams): Promise<{
  events: IndexedEvent[];
  total: number;
  updatedAt: number;
}> {
  const all = await getIndexedEvents();

  let filtered = all.filter((e) => {
    if (params.organizer && e.organizer !== params.organizer) return false;
    if (params.status && e.status !== params.status) return false;
    if (params.type && e.type !== params.type) return false;
    const ts = Math.floor(new Date(e.ledgerClosedAt).getTime() / 1000);
    if (params.from && ts < params.from) return false;
    if (params.to && ts > params.to) return false;
    return true;
  });

  const total = filtered.length;
  const offset = params.offset ?? 0;
  const limit = Math.min(params.limit ?? 50, 200);
  filtered = filtered.slice(offset, offset + limit);

  return { events: filtered, total, updatedAt: cache.updatedAt };
}

export function getCacheStats() {
  return {
    totalEvents: cache.events.length,
    lastLedger: cache.lastLedger,
    updatedAt: cache.updatedAt,
    ttlMs: CACHE_TTL_MS,
  };
}
