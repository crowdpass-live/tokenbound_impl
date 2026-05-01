import {
  ContractSchemaCache,
  MemorySchemaStore,
  WebStorageSchemaStore,
  staticSchemaResolver,
  type ContractSchema,
  type SchemaCacheEvent,
  type SchemaIdentityProbe,
  type SchemaResolver,
} from "@/sdk/src/schemaCache";

const CONTRACT_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

function makeSchema(
  overrides: Partial<Omit<ContractSchema, "fetchedAt">> = {},
): Omit<ContractSchema, "fetchedAt"> {
  return {
    contractId: CONTRACT_ID,
    version: 1,
    wasmHash: "deadbeef",
    methods: [{ name: "ping", args: [], returns: "u32", mutates: false }],
    errors: [{ name: "Unauthorized", code: 1 }],
    ...overrides,
  };
}

class StubResolver implements SchemaResolver {
  public readonly calls: string[] = [];
  private readonly responses: Array<Omit<ContractSchema, "fetchedAt">>;

  constructor(responses: Array<Omit<ContractSchema, "fetchedAt">>) {
    this.responses = responses;
  }

  async resolve(contractId: string) {
    this.calls.push(contractId);
    if (this.responses.length === 0) {
      throw new Error("StubResolver: no more responses queued");
    }
    return this.responses.shift()!;
  }
}

class StubProbe implements SchemaIdentityProbe {
  public readonly calls: string[] = [];
  private readonly responses: Array<{ version: number; wasmHash: string }>;

  constructor(responses: Array<{ version: number; wasmHash: string }>) {
    this.responses = responses;
  }

  async probe(contractId: string) {
    this.calls.push(contractId);
    if (this.responses.length === 0) {
      throw new Error("StubProbe: no more responses queued");
    }
    return this.responses.shift()!;
  }
}

describe("ContractSchemaCache", () => {
  it("fetches and stores on first access", async () => {
    const resolver = new StubResolver([makeSchema()]);
    const cache = new ContractSchemaCache({ resolver, now: () => 1_000 });

    const schema = await cache.get(CONTRACT_ID);

    expect(schema.contractId).toBe(CONTRACT_ID);
    expect(schema.version).toBe(1);
    expect(schema.fetchedAt).toBe(1_000);
    expect(resolver.calls).toEqual([CONTRACT_ID]);
  });

  it("returns the cached entry without refetching when probe matches", async () => {
    const resolver = new StubResolver([makeSchema()]);
    const probe = new StubProbe([{ version: 1, wasmHash: "deadbeef" }]);
    const cache = new ContractSchemaCache({ resolver, probe });

    await cache.get(CONTRACT_ID);
    const second = await cache.get(CONTRACT_ID);

    expect(second.version).toBe(1);
    expect(resolver.calls).toEqual([CONTRACT_ID]);
    expect(probe.calls).toEqual([CONTRACT_ID]);
  });

  it("refreshes when the on-chain version differs", async () => {
    const resolver = new StubResolver([
      makeSchema({ version: 1 }),
      makeSchema({ version: 2 }),
    ]);
    const probe = new StubProbe([{ version: 2, wasmHash: "deadbeef" }]);
    const cache = new ContractSchemaCache({ resolver, probe });

    await cache.get(CONTRACT_ID);
    const refreshed = await cache.get(CONTRACT_ID);

    expect(refreshed.version).toBe(2);
    expect(resolver.calls).toEqual([CONTRACT_ID, CONTRACT_ID]);
  });

  it("refreshes when the on-chain wasmHash differs", async () => {
    const resolver = new StubResolver([
      makeSchema({ wasmHash: "aaaa" }),
      makeSchema({ wasmHash: "bbbb" }),
    ]);
    const probe = new StubProbe([{ version: 1, wasmHash: "bbbb" }]);
    const cache = new ContractSchemaCache({ resolver, probe });

    await cache.get(CONTRACT_ID);
    const refreshed = await cache.get(CONTRACT_ID);

    expect(refreshed.wasmHash).toBe("bbbb");
    expect(resolver.calls).toEqual([CONTRACT_ID, CONTRACT_ID]);
  });

  it("never probes when no probe is configured", async () => {
    const resolver = new StubResolver([
      makeSchema(),
      makeSchema({ version: 99 }),
    ]);
    const cache = new ContractSchemaCache({ resolver });

    const first = await cache.get(CONTRACT_ID);
    const second = await cache.get(CONTRACT_ID);

    expect(first.version).toBe(1);
    expect(second.version).toBe(1); // still cached, despite the queued v99
    expect(resolver.calls).toEqual([CONTRACT_ID]);
  });

  it("manual refresh forces a refetch even when fresh", async () => {
    const resolver = new StubResolver([
      makeSchema(),
      makeSchema({ version: 5 }),
    ]);
    const cache = new ContractSchemaCache({ resolver });

    await cache.get(CONTRACT_ID);
    const refreshed = await cache.refresh(CONTRACT_ID);

    expect(refreshed.version).toBe(5);
    expect(resolver.calls).toEqual([CONTRACT_ID, CONTRACT_ID]);
  });

  it("invalidate drops the entry", async () => {
    const resolver = new StubResolver([
      makeSchema(),
      makeSchema({ version: 7 }),
    ]);
    const cache = new ContractSchemaCache({ resolver });

    await cache.get(CONTRACT_ID);
    cache.invalidate(CONTRACT_ID);
    expect(cache.peek(CONTRACT_ID)).toBeUndefined();

    const next = await cache.get(CONTRACT_ID);
    expect(next.version).toBe(7);
  });

  it("clear drops every entry", async () => {
    const resolver = new StubResolver([
      makeSchema({ contractId: "A" }),
      makeSchema({ contractId: "B" }),
    ]);
    const cache = new ContractSchemaCache({ resolver });

    await cache.get("A");
    await cache.get("B");
    cache.clear();

    expect(cache.peek("A")).toBeUndefined();
    expect(cache.peek("B")).toBeUndefined();
  });

  it("emits events for hits, misses, refreshes, and invalidations", async () => {
    const resolver = new StubResolver([
      makeSchema(),
      makeSchema({ version: 3 }),
    ]);
    const probe = new StubProbe([
      { version: 1, wasmHash: "deadbeef" },
      { version: 3, wasmHash: "deadbeef" },
    ]);
    const cache = new ContractSchemaCache({ resolver, probe });
    const events: SchemaCacheEvent[] = [];
    const unsubscribe = cache.subscribe((event) => events.push(event));

    await cache.get(CONTRACT_ID); // miss + refreshed(missing)
    await cache.get(CONTRACT_ID); // hit (probe match)
    await cache.get(CONTRACT_ID); // refreshed(version)
    cache.invalidate(CONTRACT_ID); // invalidated
    unsubscribe();
    cache.invalidate(CONTRACT_ID); // no event after unsubscribe & already empty

    const types = events.map((e) => e.type);
    expect(types).toEqual([
      "miss",
      "refreshed",
      "hit",
      "refreshed",
      "invalidated",
    ]);

    const refreshedEvents = events.filter((e) => e.type === "refreshed");
    expect(refreshedEvents[0]).toMatchObject({ reason: "missing" });
    expect(refreshedEvents[1]).toMatchObject({ reason: "version" });
  });

  it("rejects schemas whose contractId does not match the request", async () => {
    const resolver = new StubResolver([makeSchema({ contractId: "OTHER" })]);
    const cache = new ContractSchemaCache({ resolver });

    await expect(cache.get(CONTRACT_ID)).rejects.toThrow(/OTHER/);
  });

  it("propagates resolver errors and does not cache failures", async () => {
    const failingResolver: SchemaResolver = {
      resolve: jest.fn().mockRejectedValueOnce(new Error("boom")),
    };
    const cache = new ContractSchemaCache({ resolver: failingResolver });

    await expect(cache.get(CONTRACT_ID)).rejects.toThrow("boom");
    expect(cache.peek(CONTRACT_ID)).toBeUndefined();
  });
});

describe("MemorySchemaStore", () => {
  it("round-trips entries", () => {
    const store = new MemorySchemaStore();
    const schema: ContractSchema = { ...makeSchema(), fetchedAt: 1 };

    expect(store.get(CONTRACT_ID)).toBeUndefined();
    store.set(CONTRACT_ID, schema);
    expect(store.get(CONTRACT_ID)).toEqual(schema);
    expect(store.keys()).toEqual([CONTRACT_ID]);

    store.delete(CONTRACT_ID);
    expect(store.get(CONTRACT_ID)).toBeUndefined();
    expect(store.keys()).toEqual([]);
  });

  it("clears every entry", () => {
    const store = new MemorySchemaStore();
    store.set("A", { ...makeSchema({ contractId: "A" }), fetchedAt: 1 });
    store.set("B", { ...makeSchema({ contractId: "B" }), fetchedAt: 2 });
    store.clear();
    expect(store.keys()).toEqual([]);
  });
});

class FakeStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  get length(): number {
    return this.data.size;
  }
}

describe("WebStorageSchemaStore", () => {
  it("persists entries to and from the underlying storage", () => {
    const storage = new FakeStorage();
    const store = new WebStorageSchemaStore(storage);
    const schema: ContractSchema = { ...makeSchema(), fetchedAt: 5 };

    store.set(CONTRACT_ID, schema);

    const direct = storage.getItem(`tokenbound:schema:${CONTRACT_ID}`);
    expect(direct).not.toBeNull();
    expect(JSON.parse(direct as string).version).toBe(1);
    expect(store.get(CONTRACT_ID)).toEqual(schema);
  });

  it("returns undefined for malformed JSON without throwing", () => {
    const storage = new FakeStorage();
    storage.setItem(`tokenbound:schema:${CONTRACT_ID}`, "{not json");
    const store = new WebStorageSchemaStore(storage);

    expect(store.get(CONTRACT_ID)).toBeUndefined();
  });

  it("returns undefined for entries missing required identity fields", () => {
    const storage = new FakeStorage();
    storage.setItem(
      `tokenbound:schema:${CONTRACT_ID}`,
      JSON.stringify({ contractId: CONTRACT_ID, methods: [] }),
    );
    const store = new WebStorageSchemaStore(storage);

    expect(store.get(CONTRACT_ID)).toBeUndefined();
  });

  it("only enumerates keys with the configured prefix", () => {
    const storage = new FakeStorage();
    storage.setItem("unrelated", "value");
    const store = new WebStorageSchemaStore(storage, "myapp:");
    store.set(CONTRACT_ID, { ...makeSchema(), fetchedAt: 0 });

    expect(store.keys()).toEqual([CONTRACT_ID]);
    expect(storage.getItem("unrelated")).toBe("value");

    store.clear();
    expect(store.keys()).toEqual([]);
    expect(storage.getItem("unrelated")).toBe("value");
  });

  it("integrates end-to-end with the cache", async () => {
    const storage = new FakeStorage();
    const store = new WebStorageSchemaStore(storage);
    const resolver = new StubResolver([makeSchema()]);
    const cache = new ContractSchemaCache({ store, resolver, now: () => 42 });

    const schema = await cache.get(CONTRACT_ID);

    // Re-create the cache with the same storage — should not call the resolver again.
    const probe = new StubProbe([{ version: 1, wasmHash: "deadbeef" }]);
    const recoveredResolver = new StubResolver([]);
    const recovered = new ContractSchemaCache({
      store: new WebStorageSchemaStore(storage),
      resolver: recoveredResolver,
      probe,
    });

    const second = await recovered.get(CONTRACT_ID);
    expect(second.fetchedAt).toBe(schema.fetchedAt);
    expect(recoveredResolver.calls).toEqual([]);
  });
});

describe("staticSchemaResolver", () => {
  it("returns the registered schema", async () => {
    const resolver = staticSchemaResolver({
      [CONTRACT_ID]: makeSchema({ version: 9 }),
    });

    const schema = await resolver.resolve(CONTRACT_ID);
    expect(schema.version).toBe(9);
  });

  it("throws for unknown contract ids", async () => {
    const resolver = staticSchemaResolver({});
    await expect(resolver.resolve(CONTRACT_ID)).rejects.toThrow(
      /No static schema/,
    );
  });
});
