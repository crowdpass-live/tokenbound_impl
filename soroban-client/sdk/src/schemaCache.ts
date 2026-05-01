/**
 * Contract schema cache with version- and hash-based invalidation.
 *
 * Soroban contracts in this repo follow the upgradeable pattern (see
 * `soroban-contract/contracts/upgradeable`): every contract exposes
 * `version()` (a monotonic counter bumped on each upgrade) and is backed by
 * a WASM whose hash changes when the code changes. This module caches the
 * full method/error spec for a contract keyed by `(contractId, version,
 * wasmHash)` so callers do not refetch on every interaction, and refreshes
 * automatically when either identity component changes.
 *
 * The module is intentionally free of any `@stellar/stellar-sdk` import:
 * the resolver and probe are injectable interfaces. A reference RPC-backed
 * resolver can live alongside but it is not required for the cache to be
 * useful (e.g. tests, or builds that ship a pinned spec snapshot).
 */

export interface ContractMethodArg {
  readonly name: string;
  readonly type: string;
}

export interface ContractMethodSpec {
  readonly name: string;
  readonly args: readonly ContractMethodArg[];
  readonly returns: string;
  readonly mutates: boolean;
}

export interface ContractErrorSpec {
  readonly name: string;
  readonly code: number;
}

export interface ContractIdentity {
  /** Stellar contract address, e.g. `C…`. */
  readonly contractId: string;
  /** Monotonic version exposed by the upgradeable library. */
  readonly version: number;
  /**
   * Hex (or any opaque string) representation of the deployed WASM hash.
   * The cache treats it as an opaque equality token.
   */
  readonly wasmHash: string;
}

export interface ContractSchema extends ContractIdentity {
  readonly methods: readonly ContractMethodSpec[];
  readonly errors: readonly ContractErrorSpec[];
  /** Epoch milliseconds when this entry was written into the cache. */
  readonly fetchedAt: number;
}

/**
 * Cheap probe used to decide whether a cached entry is still valid. A real
 * implementation will read the contract's `version()` and the WASM hash
 * from the contract instance ledger entry; tests pass a stub.
 */
export interface SchemaIdentityProbe {
  probe(contractId: string): Promise<{ version: number; wasmHash: string }>;
}

/**
 * Loads a full schema for a contract. Called only when the cache is empty
 * for that contract or when the probe reports an identity change.
 */
export interface SchemaResolver {
  resolve(contractId: string): Promise<Omit<ContractSchema, "fetchedAt">>;
}

/** Pluggable persistence backend. Default is in-memory. */
export interface SchemaStore {
  get(contractId: string): ContractSchema | undefined;
  set(contractId: string, schema: ContractSchema): void;
  delete(contractId: string): void;
  clear(): void;
  keys(): readonly string[];
}

export class MemorySchemaStore implements SchemaStore {
  private readonly entries = new Map<string, ContractSchema>();

  get(contractId: string): ContractSchema | undefined {
    return this.entries.get(contractId);
  }

  set(contractId: string, schema: ContractSchema): void {
    this.entries.set(contractId, schema);
  }

  delete(contractId: string): void {
    this.entries.delete(contractId);
  }

  clear(): void {
    this.entries.clear();
  }

  keys(): readonly string[] {
    return Array.from(this.entries.keys());
  }
}

/** Minimal Web Storage shape so this module does not depend on `lib.dom`. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

const DEFAULT_STORAGE_PREFIX = "tokenbound:schema:";

/**
 * Persists schemas in a `Storage` (localStorage / sessionStorage). Only
 * entries whose key matches the configured prefix are touched — sharing
 * the storage with unrelated data is safe.
 */
export class WebStorageSchemaStore implements SchemaStore {
  private readonly storage: KeyValueStorage;
  private readonly prefix: string;

  constructor(
    storage: KeyValueStorage,
    prefix: string = DEFAULT_STORAGE_PREFIX,
  ) {
    this.storage = storage;
    this.prefix = prefix;
  }

  private storageKey(contractId: string): string {
    return `${this.prefix}${contractId}`;
  }

  get(contractId: string): ContractSchema | undefined {
    const raw = this.storage.getItem(this.storageKey(contractId));
    if (!raw) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as ContractSchema;
      if (
        typeof parsed?.contractId !== "string" ||
        typeof parsed?.version !== "number" ||
        typeof parsed?.wasmHash !== "string"
      ) {
        return undefined;
      }
      return parsed;
    } catch {
      return undefined;
    }
  }

  set(contractId: string, schema: ContractSchema): void {
    this.storage.setItem(this.storageKey(contractId), JSON.stringify(schema));
  }

  delete(contractId: string): void {
    this.storage.removeItem(this.storageKey(contractId));
  }

  clear(): void {
    for (const key of this.keys()) {
      this.storage.removeItem(this.storageKey(key));
    }
  }

  keys(): readonly string[] {
    const result: string[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key && key.startsWith(this.prefix)) {
        result.push(key.slice(this.prefix.length));
      }
    }
    return result;
  }
}

export type SchemaCacheEvent =
  | { readonly type: "hit"; readonly schema: ContractSchema }
  | { readonly type: "miss"; readonly contractId: string }
  | {
      readonly type: "refreshed";
      readonly schema: ContractSchema;
      readonly previous: ContractSchema | undefined;
      readonly reason: "missing" | "version" | "wasmHash" | "manual";
    }
  | { readonly type: "invalidated"; readonly contractId: string };

export type SchemaCacheListener = (event: SchemaCacheEvent) => void;

export interface ContractSchemaCacheOptions {
  readonly store?: SchemaStore;
  readonly resolver: SchemaResolver;
  readonly probe?: SchemaIdentityProbe;
  /** Defaults to `() => Date.now()`; overridable for deterministic tests. */
  readonly now?: () => number;
}

export class ContractSchemaCache {
  private readonly store: SchemaStore;
  private readonly resolver: SchemaResolver;
  private readonly probe: SchemaIdentityProbe | undefined;
  private readonly now: () => number;
  private readonly listeners = new Set<SchemaCacheListener>();

  constructor(options: ContractSchemaCacheOptions) {
    this.store = options.store ?? new MemorySchemaStore();
    this.resolver = options.resolver;
    this.probe = options.probe;
    this.now = options.now ?? (() => Date.now());
  }

  /** Subscribe to cache events. Returns an unsubscribe function. */
  subscribe(listener: SchemaCacheListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: SchemaCacheEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  /** Synchronously read the cached entry without probing or fetching. */
  peek(contractId: string): ContractSchema | undefined {
    return this.store.get(contractId);
  }

  /** Read a schema, fetching or refreshing as needed. */
  async get(contractId: string): Promise<ContractSchema> {
    const cached = this.store.get(contractId);
    if (!cached) {
      this.emit({ type: "miss", contractId });
      return this.fetchAndStore(contractId, undefined, "missing");
    }

    const reason = this.probe ? await this.staleReason(cached) : null;
    if (reason) {
      return this.fetchAndStore(contractId, cached, reason);
    }

    this.emit({ type: "hit", schema: cached });
    return cached;
  }

  private async staleReason(
    cached: ContractSchema,
  ): Promise<"version" | "wasmHash" | null> {
    if (!this.probe) {
      return null;
    }
    const current = await this.probe.probe(cached.contractId);
    if (current.version !== cached.version) {
      return "version";
    }
    if (current.wasmHash !== cached.wasmHash) {
      return "wasmHash";
    }
    return null;
  }

  /**
   * Force a refetch and replace the cached entry. Useful from a UI on user
   * action ("force refresh"), or when an upgrade event has been observed.
   */
  async refresh(contractId: string): Promise<ContractSchema> {
    const previous = this.store.get(contractId);
    return this.fetchAndStore(contractId, previous, "manual");
  }

  /** Drop a single contract's cached entry. */
  invalidate(contractId: string): void {
    if (this.store.get(contractId) !== undefined) {
      this.store.delete(contractId);
      this.emit({ type: "invalidated", contractId });
    }
  }

  /** Drop every cached entry managed by this cache. */
  clear(): void {
    for (const key of this.store.keys()) {
      this.invalidate(key);
    }
  }

  private async fetchAndStore(
    contractId: string,
    previous: ContractSchema | undefined,
    reason: "missing" | "version" | "wasmHash" | "manual",
  ): Promise<ContractSchema> {
    const fresh = await this.resolver.resolve(contractId);
    if (fresh.contractId !== contractId) {
      throw new Error(
        `Resolver returned a schema for ${fresh.contractId} but ${contractId} was requested.`,
      );
    }
    const schema: ContractSchema = { ...fresh, fetchedAt: this.now() };
    this.store.set(contractId, schema);
    this.emit({ type: "refreshed", schema, previous, reason });
    return schema;
  }
}

/**
 * Build a {@link SchemaResolver} from a static map of pre-known schemas
 * (e.g. the build-time generated specs). Useful as an offline fallback or
 * for tests.
 */
export function staticSchemaResolver(
  schemas: Readonly<Record<string, Omit<ContractSchema, "fetchedAt">>>,
): SchemaResolver {
  return {
    async resolve(contractId: string) {
      const schema = schemas[contractId];
      if (!schema) {
        throw new Error(`No static schema registered for ${contractId}.`);
      }
      return schema;
    },
  };
}
