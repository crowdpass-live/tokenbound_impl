/**
 * Tests for event-consumer checkpoint save/resume.
 *
 * Covers:
 *   - FileCheckpointStore round-trip and atomic write semantics
 *   - MemoryCheckpointStore basics
 *   - Schema-version mismatch is treated as missing
 *   - Indexer hydrates from a saved checkpoint and persists after polling
 *   - Persistence failures do not break the consumer
 */

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CHECKPOINT_SCHEMA_VERSION,
  FileCheckpointStore,
  MemoryCheckpointStore,
  type CheckpointStore,
  type ConsumerCheckpoint,
} from "@/lib/checkpoint";
import {
  getCacheStats,
  getIndexedEvents,
  resetIndexer,
  setCheckpointStore,
  type IndexedEvent,
} from "@/lib/indexer";

const sampleEvent: IndexedEvent = {
  id: "100-0-0-0",
  type: "EventCreated",
  ledger: 100,
  ledgerClosedAt: "2026-04-26T00:00:00Z",
  txHash: "tx",
  contractId: "CTEST",
  eventId: 1,
  status: "active",
};

function makeCheckpoint(
  overrides: Partial<ConsumerCheckpoint> = {},
): ConsumerCheckpoint {
  return {
    version: CHECKPOINT_SCHEMA_VERSION,
    lastLedger: 100,
    events: [sampleEvent],
    updatedAt: 1700000000000,
    ...overrides,
  };
}

describe("FileCheckpointStore", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "ckpt-"));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns null when the file is missing", async () => {
    const store = new FileCheckpointStore(path.join(dir, "missing.json"));
    expect(await store.load()).toBeNull();
  });

  it("round-trips a checkpoint", async () => {
    const file = path.join(dir, "ckpt.json");
    const store = new FileCheckpointStore(file);
    const ckpt = makeCheckpoint();

    await store.save(ckpt);
    const loaded = await store.load();
    expect(loaded).toEqual(ckpt);
  });

  it("creates parent directories when saving", async () => {
    const file = path.join(dir, "nested", "deep", "ckpt.json");
    const store = new FileCheckpointStore(file);

    await store.save(makeCheckpoint());
    const loaded = await store.load();
    expect(loaded?.lastLedger).toBe(100);
  });

  it("treats a checkpoint from a different schema version as missing", async () => {
    const file = path.join(dir, "ckpt.json");
    const store = new FileCheckpointStore(file);
    await fs.writeFile(
      file,
      JSON.stringify({
        ...makeCheckpoint(),
        version: CHECKPOINT_SCHEMA_VERSION + 1,
      }),
      "utf8",
    );
    expect(await store.load()).toBeNull();
  });

  it("treats a corrupt checkpoint file as missing", async () => {
    const file = path.join(dir, "ckpt.json");
    await fs.writeFile(file, "{not json", "utf8");
    const store = new FileCheckpointStore(file);
    expect(await store.load()).toBeNull();
  });

  it("does not leave a tmp file behind on the happy path", async () => {
    const file = path.join(dir, "ckpt.json");
    const store = new FileCheckpointStore(file);
    await store.save(makeCheckpoint());

    const entries = await fs.readdir(dir);
    expect(entries).toEqual(["ckpt.json"]);
  });

  it("serializes concurrent saves so the final file matches the last write", async () => {
    const file = path.join(dir, "ckpt.json");
    const store = new FileCheckpointStore(file);

    await Promise.all([
      store.save(makeCheckpoint({ lastLedger: 1 })),
      store.save(makeCheckpoint({ lastLedger: 2 })),
      store.save(makeCheckpoint({ lastLedger: 3 })),
    ]);

    const loaded = await store.load();
    expect(loaded?.lastLedger).toBe(3);
  });

  it("reset() removes the file and tolerates a missing one", async () => {
    const file = path.join(dir, "ckpt.json");
    const store = new FileCheckpointStore(file);
    await store.save(makeCheckpoint());

    await store.reset();
    expect(await store.load()).toBeNull();

    // Second reset on already-missing file should not throw.
    await expect(store.reset()).resolves.toBeUndefined();
  });
});

describe("MemoryCheckpointStore", () => {
  it("isolates writes via structured cloning", async () => {
    const store = new MemoryCheckpointStore();
    const ckpt = makeCheckpoint();
    await store.save(ckpt);

    ckpt.lastLedger = 999;
    const loaded = await store.load();
    expect(loaded?.lastLedger).toBe(100);
  });
});

describe("indexer checkpoint integration", () => {
  let store: MemoryCheckpointStore;
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(async () => {
    // Bind the test store first so resetIndexer clears the right store, then
    // re-bind a fresh one for the test body.
    setCheckpointStore(new MemoryCheckpointStore());
    await resetIndexer();
    store = new MemoryCheckpointStore();
    setCheckpointStore(store);
    fetchMock.mockReset();
    (global as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    (global as { fetch: typeof fetch }).fetch = originalFetch;
  });

  function mockHorizonResponse(
    records: Array<{ ledger: number; eventId: number }>,
  ) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        _embedded: {
          records: records.map((r) => ({
            id: `${r.ledger}-0-0-0`,
            ledger: r.ledger,
            ledger_closed_at: "2026-04-26T00:00:00Z",
            transaction_hash: "tx",
            contract_id: "CTEST",
            type: "contract",
            // EventCreated symbol bytes: type tag (4) + length (4) + "EventCreated"
            topic: [
              { type: "Symbol", value: encodeSymbolTopic("EventCreated") },
              { type: "U32", value: encodeU32(r.eventId) },
            ],
            value: { type: "I128", value: encodeI128(0n) },
          })),
        },
        _links: {},
      }),
    });
  }

  it("persists the cursor after a successful poll", async () => {
    mockHorizonResponse([{ ledger: 50, eventId: 1 }]);

    const events = await getIndexedEvents();
    expect(events).toHaveLength(1);
    expect(getCacheStats().lastLedger).toBe(50);

    const saved = await store.load();
    expect(saved).not.toBeNull();
    expect(saved?.lastLedger).toBe(50);
    expect(saved?.events).toHaveLength(1);
    expect(saved?.version).toBe(CHECKPOINT_SCHEMA_VERSION);
  });

  it("resumes from a saved checkpoint without re-scanning history", async () => {
    await store.save(
      makeCheckpoint({ lastLedger: 500, events: [sampleEvent] }),
    );
    // No fetch is queued. If hydration works, the cached events are returned
    // without forcing a Horizon call (cache TTL defeated by hydrated state
    // means we *do* poll once on the first call, so queue an empty response).
    mockHorizonResponse([]);

    const events = await getIndexedEvents();
    expect(events.map((e) => e.id)).toContain(sampleEvent.id);
    expect(getCacheStats().lastLedger).toBe(500);
    expect(getCacheStats().hydratedFromCheckpoint).toBe(true);

    // The Horizon request should have used the resumed cursor.
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("cursor=500-0-0-0");
  });

  it("does not break the consumer when persistence fails", async () => {
    const failing: CheckpointStore = {
      load: async () => null,
      save: async () => {
        throw new Error("disk full");
      },
      reset: async () => {},
    };
    setCheckpointStore(failing);
    mockHorizonResponse([{ ledger: 10, eventId: 1 }]);

    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(getIndexedEvents()).resolves.toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ── XDR encoding helpers (mirror the decoders in lib/indexer.ts) ─────────────

function encodeSymbolTopic(symbol: string): string {
  // 4 bytes type tag (unused by decoder), 4 bytes length, then symbol bytes.
  const payload = Buffer.from(symbol, "utf8");
  const buf = Buffer.alloc(8 + payload.length);
  buf.writeUInt32BE(0, 0);
  buf.writeUInt32BE(payload.length, 4);
  payload.copy(buf, 8);
  return buf.toString("base64");
}

function encodeU32(value: number): string {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value, 0);
  return buf.toString("base64");
}

function encodeI128(value: bigint): string {
  const buf = Buffer.alloc(16);
  const mask = (1n << 64n) - 1n;
  const hi = (value >> 64n) & mask;
  const lo = value & mask;
  buf.writeBigUInt64BE(hi, 0);
  buf.writeBigUInt64BE(lo, 8);
  return buf.toString("base64");
}
