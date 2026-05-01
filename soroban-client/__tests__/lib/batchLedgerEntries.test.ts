import {
  DEFAULT_BATCH_CHUNK_SIZE,
  batchGetLedgerEntries,
  type BatchLedgerEntriesOptions,
  type LedgerEntriesFetcher,
} from "@/sdk/src/batchLedgerEntries";

// We import only types from stellar-sdk in the helper, and tests never need
// the real LedgerKey type — the helper takes a structural `keyId` callback
// so we model keys as plain strings here.
type FakeKey = string;

interface FakeLedgerEntryResult {
  readonly key: FakeKey;
  readonly val: unknown;
  readonly liveUntilLedgerSeq?: number;
}

interface FakeBatchResponse {
  readonly entries: FakeLedgerEntryResult[];
  readonly latestLedger: number;
}

function buildFetcher(
  handler: (keys: FakeKey[]) => Promise<FakeBatchResponse> | FakeBatchResponse,
): LedgerEntriesFetcher & { calls: FakeKey[][] } {
  const calls: FakeKey[][] = [];
  const fetcher = {
    calls,
    async getLedgerEntries(...keys: unknown[]) {
      calls.push(keys as FakeKey[]);
      const response = await handler(keys as FakeKey[]);
      return response as never;
    },
  };
  return fetcher as LedgerEntriesFetcher & { calls: FakeKey[][] };
}

const baseOptions = (): BatchLedgerEntriesOptions => ({
  // Casting through `unknown` because the helper's signature uses the
  // real xdr.LedgerKey type but our tests use plain strings.
  keyId: (key) => key as unknown as string,
});

describe("batchGetLedgerEntries", () => {
  it("returns immediately for an empty key list without calling the RPC", async () => {
    const fetcher = buildFetcher(() => {
      throw new Error("RPC should not be called for empty input");
    });

    const result = await batchGetLedgerEntries(fetcher, [], baseOptions());

    expect(result).toEqual({
      entries: [],
      errors: [],
      latestLedger: 0,
      found: 0,
      missing: 0,
      failed: 0,
    });
    expect(fetcher.calls).toEqual([]);
  });

  it("fans out a single chunk when input fits within the chunk size", async () => {
    const fetcher = buildFetcher((keys) => ({
      entries: keys.map((key) => ({ key, val: `val:${key}` })),
      latestLedger: 42,
    }));

    const result = await batchGetLedgerEntries(
      fetcher,
      ["a", "b", "c"] as never,
      baseOptions(),
    );

    expect(fetcher.calls).toEqual([["a", "b", "c"]]);
    expect(result.entries).toEqual([
      { key: "a", val: "val:a" },
      { key: "b", val: "val:b" },
      { key: "c", val: "val:c" },
    ]);
    expect(result.latestLedger).toBe(42);
    expect(result.found).toBe(3);
    expect(result.missing).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("chunks oversized inputs into multiple RPC calls", async () => {
    const keys = Array.from({ length: 7 }, (_, index) => `k${index}`);
    const fetcher = buildFetcher((chunkKeys) => ({
      entries: chunkKeys.map((key) => ({ key, val: key.toUpperCase() })),
      latestLedger: 100,
    }));

    const result = await batchGetLedgerEntries(fetcher, keys as never, {
      ...baseOptions(),
      chunkSize: 3,
    });

    expect(fetcher.calls).toEqual([
      ["k0", "k1", "k2"],
      ["k3", "k4", "k5"],
      ["k6"],
    ]);
    expect(result.entries.map((entry) => (entry ? entry.val : entry))).toEqual([
      "K0",
      "K1",
      "K2",
      "K3",
      "K4",
      "K5",
      "K6",
    ]);
    expect(result.found).toBe(7);
  });

  it("aligns missing entries to null while preserving input order", async () => {
    // RPC returns only the entries that exist; the helper must back-fill
    // null at the corresponding input positions.
    const fetcher = buildFetcher((keys) => ({
      entries: keys
        .filter((key) => key !== "missing-1" && key !== "missing-2")
        .map((key) => ({ key, val: key })),
      latestLedger: 7,
    }));

    const result = await batchGetLedgerEntries(
      fetcher,
      ["a", "missing-1", "b", "missing-2", "c"] as never,
      baseOptions(),
    );

    expect(result.entries).toEqual([
      { key: "a", val: "a" },
      null,
      { key: "b", val: "b" },
      null,
      { key: "c", val: "c" },
    ]);
    expect(result.found).toBe(3);
    expect(result.missing).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("records partial-failure chunk errors and keeps successful chunk data", async () => {
    let callIndex = 0;
    const fetcher = buildFetcher((keys) => {
      callIndex += 1;
      if (callIndex === 2) {
        throw new Error("rpc 5xx");
      }
      return {
        entries: keys.map((key) => ({ key, val: key })),
        latestLedger: 99,
      };
    });

    const result = await batchGetLedgerEntries(
      fetcher,
      ["a", "b", "c", "d"] as never,
      { ...baseOptions(), chunkSize: 2, concurrency: 1 },
    );

    expect(result.entries).toEqual([
      { key: "a", val: "a" },
      { key: "b", val: "b" },
      undefined, // chunk 2 failed
      undefined,
    ]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].indexes).toEqual([2, 3]);
    expect((result.errors[0].error as Error).message).toBe("rpc 5xx");
    expect(result.found).toBe(2);
    expect(result.missing).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.latestLedger).toBe(99);
  });

  it("uses the latest 'latestLedger' across successful chunks", async () => {
    const ledgers = [10, 30, 20];
    let chunkIdx = 0;
    const fetcher = buildFetcher((keys) => {
      const latestLedger = ledgers[chunkIdx];
      chunkIdx += 1;
      return {
        entries: keys.map((key) => ({ key, val: key })),
        latestLedger,
      };
    });

    const result = await batchGetLedgerEntries(
      fetcher,
      ["a", "b", "c"] as never,
      { ...baseOptions(), chunkSize: 1, concurrency: 1 },
    );

    expect(result.latestLedger).toBe(30);
  });

  it("returns latestLedger=0 when every chunk fails", async () => {
    const fetcher = buildFetcher(() => {
      throw new Error("network down");
    });

    const result = await batchGetLedgerEntries(fetcher, ["a", "b"] as never, {
      ...baseOptions(),
      chunkSize: 1,
      concurrency: 1,
    });

    expect(result.latestLedger).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
  });

  it("deduplicates duplicate input keys without a second RPC trip per duplicate", async () => {
    // Two duplicate input keys still send one RPC roundtrip per *occurrence*
    // (because we don't dedupe the request itself), but both indexes must
    // receive the entry the RPC returned for the shared identity.
    const fetcher = buildFetcher((keys) => {
      // RPC returns only one entry for "x" even though the request has two.
      const unique = Array.from(new Set(keys));
      return {
        entries: unique.map((key) => ({ key, val: key })),
        latestLedger: 1,
      };
    });

    const result = await batchGetLedgerEntries(
      fetcher,
      ["x", "y", "x"] as never,
      baseOptions(),
    );

    expect(result.entries).toEqual([
      { key: "x", val: "x" },
      { key: "y", val: "y" },
      { key: "x", val: "x" },
    ]);
    expect(result.found).toBe(3);
  });

  it("ignores response entries whose key was not requested", async () => {
    const fetcher = buildFetcher(() => ({
      entries: [
        { key: "a", val: "a" },
        { key: "stranger", val: "?" }, // not in the input
      ],
      latestLedger: 1,
    }));

    const result = await batchGetLedgerEntries(
      fetcher,
      ["a", "b"] as never,
      baseOptions(),
    );

    expect(result.entries).toEqual([{ key: "a", val: "a" }, null]);
    expect(result.errors).toEqual([]);
  });

  it("respects the concurrency limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetcher = buildFetcher(async (keys) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return {
        entries: keys.map((key) => ({ key, val: key })),
        latestLedger: 1,
      };
    });

    const keys = Array.from({ length: 6 }, (_, index) => `k${index}`);
    await batchGetLedgerEntries(fetcher, keys as never, {
      ...baseOptions(),
      chunkSize: 1,
      concurrency: 2,
    });

    expect(maxInFlight).toBe(2);
  });

  it("validates chunkSize and concurrency", async () => {
    const fetcher = buildFetcher(() => ({ entries: [], latestLedger: 0 }));
    await expect(
      batchGetLedgerEntries(fetcher, ["a"] as never, {
        ...baseOptions(),
        chunkSize: 0,
      }),
    ).rejects.toThrow(/chunkSize/);

    await expect(
      batchGetLedgerEntries(fetcher, ["a"] as never, {
        ...baseOptions(),
        concurrency: 0,
      }),
    ).rejects.toThrow(/concurrency/);
  });

  it("uses DEFAULT_BATCH_CHUNK_SIZE when no chunkSize override is given", async () => {
    const fetcher = buildFetcher((keys) => ({
      entries: keys.map((key) => ({ key, val: key })),
      latestLedger: 1,
    }));

    const keys = Array.from(
      { length: DEFAULT_BATCH_CHUNK_SIZE + 1 },
      (_, index) => `k${index}`,
    );

    await batchGetLedgerEntries(fetcher, keys as never, baseOptions());

    expect(fetcher.calls).toHaveLength(2);
    expect(fetcher.calls[0]).toHaveLength(DEFAULT_BATCH_CHUNK_SIZE);
    expect(fetcher.calls[1]).toHaveLength(1);
  });
});
