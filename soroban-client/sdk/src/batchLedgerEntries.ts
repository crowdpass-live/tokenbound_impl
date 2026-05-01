/**
 * Batch ledger-entry fetch helper with partial-failure handling.
 *
 * Soroban RPC's `getLedgerEntries` returns up to ~100 keys per call and
 * silently omits missing keys from the response. Any non-trivial reader
 * therefore needs to: chunk over the limit, map responses back to the
 * original input ordering, surface missing keys as `null` rather than as
 * an indistinguishable absence, and survive per-chunk failures (a single
 * 5xx in a thundering-herd refresh shouldn't lose every other chunk's
 * data). This module wraps that workflow so callers can hand it a flat
 * `xdr.LedgerKey[]` and get back an aligned result + a structured error
 * list.
 *
 * The module deliberately keeps stellar-sdk imports type-only so it stays
 * tree-shakeable and so tests can run without pulling the SDK's runtime
 * (which currently breaks under jsdom without a TextEncoder polyfill).
 */

import type { rpc, xdr } from "@stellar/stellar-sdk";

/** Soroban RPC enforces a 100-key cap per `getLedgerEntries` call. */
export const DEFAULT_BATCH_CHUNK_SIZE = 100;

/** Default number of chunk RPCs to run in parallel. */
export const DEFAULT_BATCH_CONCURRENCY = 4;

/** Minimal shape required from the RPC client. Accepts `rpc.Server`. */
export interface LedgerEntriesFetcher {
  getLedgerEntries(
    ...keys: xdr.LedgerKey[]
  ): Promise<rpc.Api.GetLedgerEntriesResponse>;
}

export interface BatchLedgerEntriesOptions {
  /**
   * Maximum keys per RPC call. Defaults to {@link DEFAULT_BATCH_CHUNK_SIZE}.
   * Must be at least 1.
   */
  readonly chunkSize?: number;

  /**
   * Number of chunk RPCs to run in parallel. Defaults to
   * {@link DEFAULT_BATCH_CONCURRENCY}. Must be at least 1.
   */
  readonly concurrency?: number;

  /**
   * Function that computes a stable identity for a {@link xdr.LedgerKey}
   * so response entries can be aligned with input positions. Defaults to
   * the canonical XDR-base64 encoding.
   */
  readonly keyId?: (key: xdr.LedgerKey) => string;
}

export interface BatchLedgerChunkError {
  /**
   * Indexes (into the original input array) whose entries could not be
   * fetched because the chunk RPC threw.
   */
  readonly indexes: readonly number[];
  /** The error thrown by the RPC for this chunk. */
  readonly error: unknown;
}

export interface BatchLedgerEntriesResult {
  /**
   * Aligned with the input `keys` array. `null` means the key was not
   * present on-chain; `undefined` means the chunk that contained the key
   * failed (see `errors`).
   */
  readonly entries: ReadonlyArray<rpc.Api.LedgerEntryResult | null | undefined>;
  /** One entry per failed chunk. Empty when every chunk succeeded. */
  readonly errors: readonly BatchLedgerChunkError[];
  /**
   * The most recent `latestLedger` reported across all successful chunks.
   * `0` if every chunk failed (or input was empty).
   */
  readonly latestLedger: number;
  /** Count of input keys that returned a present entry. */
  readonly found: number;
  /** Count of input keys whose chunks succeeded but returned no entry. */
  readonly missing: number;
  /** Count of input keys belonging to a failed chunk. */
  readonly failed: number;
}

const defaultKeyId = (key: xdr.LedgerKey): string => key.toXDR("base64");

function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1 || !Number.isFinite(size)) {
    throw new Error(`chunkSize must be a positive integer (got ${size}).`);
  }
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/**
 * Run async tasks with bounded concurrency, preserving completion order
 * via the index passed to the worker. Errors are caught per-task by the
 * caller (this helper does not abort sibling tasks on failure).
 */
async function runWithConcurrency<T>(
  count: number,
  concurrency: number,
  worker: (index: number) => Promise<T>,
): Promise<T[]> {
  if (concurrency < 1 || !Number.isFinite(concurrency)) {
    throw new Error(
      `concurrency must be a positive integer (got ${concurrency}).`,
    );
  }
  const results: T[] = new Array(count);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, count) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= count) {
          return;
        }
        results[index] = await worker(index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/**
 * Fetch many ledger entries in one workflow.
 *
 * @example
 * ```ts
 * const result = await batchGetLedgerEntries(sdk.rpcServer, keys);
 * for (let i = 0; i < keys.length; i += 1) {
 *   const entry = result.entries[i];
 *   if (entry === undefined) {
 *     // chunk failed — see result.errors
 *   } else if (entry === null) {
 *     // key not found on-chain
 *   } else {
 *     // entry.val is the ledger data
 *   }
 * }
 * ```
 */
export async function batchGetLedgerEntries(
  rpcClient: LedgerEntriesFetcher,
  keys: readonly xdr.LedgerKey[],
  options?: BatchLedgerEntriesOptions,
): Promise<BatchLedgerEntriesResult> {
  const chunkSize = options?.chunkSize ?? DEFAULT_BATCH_CHUNK_SIZE;
  const concurrency = options?.concurrency ?? DEFAULT_BATCH_CONCURRENCY;
  const keyId = options?.keyId ?? defaultKeyId;

  if (keys.length === 0) {
    return {
      entries: [],
      errors: [],
      latestLedger: 0,
      found: 0,
      missing: 0,
      failed: 0,
    };
  }

  // Build a multi-map from key identity to input indexes so duplicates in
  // the input array all receive the same response without forcing the
  // caller to deduplicate.
  const indexesByKeyId = new Map<string, number[]>();
  for (let index = 0; index < keys.length; index += 1) {
    const id = keyId(keys[index]);
    const bucket = indexesByKeyId.get(id);
    if (bucket) {
      bucket.push(index);
    } else {
      indexesByKeyId.set(id, [index]);
    }
  }

  const indexChunks = chunk(
    Array.from({ length: keys.length }, (_, index) => index),
    chunkSize,
  );

  const entries: Array<rpc.Api.LedgerEntryResult | null | undefined> =
    new Array(keys.length).fill(undefined);
  const errors: BatchLedgerChunkError[] = [];
  let latestLedger = 0;

  await runWithConcurrency(
    indexChunks.length,
    concurrency,
    async (chunkIdx) => {
      const chunkIndexes = indexChunks[chunkIdx];
      const chunkKeys = chunkIndexes.map((index) => keys[index]);
      let response: rpc.Api.GetLedgerEntriesResponse;
      try {
        response = await rpcClient.getLedgerEntries(...chunkKeys);
      } catch (error) {
        errors.push({ indexes: chunkIndexes, error });
        return;
      }

      if (response.latestLedger > latestLedger) {
        latestLedger = response.latestLedger;
      }

      // Default every index in this chunk to `null` (missing). Then fill in
      // the entries the RPC actually returned.
      for (const index of chunkIndexes) {
        entries[index] = null;
      }

      for (const entry of response.entries) {
        const id = keyId(entry.key);
        const matchingIndexes = indexesByKeyId.get(id);
        if (!matchingIndexes) {
          // Defensive: RPC returned a key we didn't ask for. Skip rather
          // than throw so the rest of the batch is still usable.
          continue;
        }
        for (const index of matchingIndexes) {
          if (chunkIndexes.includes(index)) {
            entries[index] = entry;
          }
        }
      }
    },
  );

  let found = 0;
  let missing = 0;
  let failed = 0;
  for (const entry of entries) {
    if (entry === undefined) {
      failed += 1;
    } else if (entry === null) {
      missing += 1;
    } else {
      found += 1;
    }
  }

  return { entries, errors, latestLedger, found, missing, failed };
}
