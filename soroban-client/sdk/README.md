# `@crowdpass/tokenbound-sdk`

Typed internal SDK for the CrowdPass Soroban contracts.

## What it includes

- Generated contract metadata derived from the Rust contract interfaces
- Typed wrappers for Event Manager, Ticket Factory, Ticket NFT, TBA Registry, and TBA Account
- Shared transaction builders for read, simulate, sign, and submit flows
- Contract error decoding into SDK-friendly error objects
- **Typed decoder utilities for safe contract response parsing**
- **Automatic retry policy with exponential backoff for RPC calls**

## Usage

```ts
import { createTokenboundSdk } from "./src";

const sdk = createTokenboundSdk({
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL!,
  sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!,
  networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE!,
  simulationSource: process.env.NEXT_PUBLIC_SOROBAN_SIM_SOURCE,
  contracts: {
    eventManager: process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT,
  },
  // Optional: Configure retry policy for RPC calls
  retryConfig: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    enableJitter: true,
  },
});

const events = await sdk.eventManager.getAllEvents();
```

### Invocation middleware hooks

You can attach middleware to run logic before and after each invocation lifecycle stage
(`simulate`, `read`, `prepareWrite`, `write`, `sendTransaction`, `waitForTransaction`).
This is useful for request signing policies, logging, tracing, and metrics.

```ts
const sdk = createTokenboundSdk({
  horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL!,
  sorobanRpcUrl: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!,
  networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE!,
  contracts: {
    eventManager: process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT,
  },
  middleware: [
    {
      before: ({ stage, contract, method }) => {
        console.log(`[before] ${stage} ${contract}.${method}`);
      },
      after: ({ stage, success, durationMs, error }) => {
        if (!success) {
          console.error(`[after] ${stage} failed in ${durationMs}ms`, error);
          return;
        }
        console.log(`[after] ${stage} success in ${durationMs}ms`);
      },
    },
  ],
});
```

### Creating an event

```ts
const result = await sdk.eventManager.createEvent(
  {
    organizer: walletAddress,
    theme: "Stellar Builders Summit",
    eventType: "Conference",
    startDate: 1790899200,
    endDate: 1790985600,
    ticketPrice: 1000_0000000n,
    totalTickets: 250n,
    paymentToken: tokenAddress,
  },
  {
    source: walletAddress,
    signTransaction,
  },
);
```

### Retry Policy

The SDK automatically retries failed RPC calls with exponential backoff and jitter. This handles transient network failures, rate limiting, and temporary service unavailability.

**Key Features:**

- Automatic retries for transient errors (network issues, timeouts, 5xx errors)
- Exponential backoff with configurable parameters
- Jitter to prevent thundering herd problems
- Smart error detection (only retries appropriate errors)

See [RETRY_POLICY.md](./RETRY_POLICY.md) for detailed documentation.

### Regenerating contract metadata

```bash
cd soroban-client
npm run sdk:generate-types
```

### Typed Decoders

The SDK provides typed decoder utilities for safely parsing contract responses:

```ts
import {
  ContractDecoder,
  decodeArray,
  decodeStruct,
  decodeU32,
  decodeString,
  decodeI128,
} from "./src";

// Decode event response
const event = ContractDecoder.event()(rawResponse);

// Decode array of tiers
const tiers = decodeArray(ContractDecoder.ticketTier())(rawTiers);

// Build custom decoders
const decodeCustom = decodeStruct({
  id: decodeU32,
  name: decodeString,
  price: decodeI128,
});
```

**Key Features:**

- Type-safe contract response parsing
- Composable decoders for complex structures
- Clear error messages with context
- Built-in Soroban type support (u32, u64, u128, i128, etc.)
- Pre-built decoders for contract types

See [DECODERS.md](./DECODERS.md) for detailed documentation.

### Batch ledger-entry fetch

`batchGetLedgerEntries` wraps `rpc.Server.getLedgerEntries` so callers can
read many keys in one workflow. It chunks over the RPC's per-call key
limit, runs chunks concurrently, aligns missing entries to `null` at
their input index, and surfaces per-chunk RPC failures in a structured
`errors` array instead of bubbling the first one and losing the rest.

```ts
import { batchGetLedgerEntries } from "@crowdpass/tokenbound-sdk";

const result = await batchGetLedgerEntries(sdk.rpcServer, ledgerKeys);

for (let i = 0; i < ledgerKeys.length; i += 1) {
  const entry = result.entries[i];
  if (entry === undefined) {
    // chunk failed — see result.errors
  } else if (entry === null) {
    // key not present on-chain
  } else {
    // entry.val is the ledger data
  }
}

// {found, missing, failed, latestLedger} are aggregated for monitoring.
```

`chunkSize`, `concurrency`, and `keyId` are all overridable.

### Caching contract schemas at runtime

Soroban contracts in this repo follow the upgradeable pattern, so each
contract's deployed `version()` and WASM hash uniquely identify its
on-chain spec. `ContractSchemaCache` caches a fetched spec keyed by that
identity and refreshes automatically when either component changes:

```ts
import {
  ContractSchemaCache,
  WebStorageSchemaStore,
  type SchemaIdentityProbe,
  type SchemaResolver,
} from "@crowdpass/tokenbound-sdk";

const probe: SchemaIdentityProbe = {
  async probe(contractId) {
    const version = Number(await sdk.eventManager.version());
    const wasmHash = await fetchWasmHash(contractId); // app-specific
    return { version, wasmHash };
  },
};

const resolver: SchemaResolver = {
  async resolve(contractId) {
    return loadSpecFromRpc(contractId); // app-specific
  },
};

const schemaCache = new ContractSchemaCache({
  store: new WebStorageSchemaStore(window.localStorage),
  resolver,
  probe,
});

const spec = await schemaCache.get(contractId);
```

`MemorySchemaStore` is used by default and is enough for server contexts;
`WebStorageSchemaStore` persists across reloads in the browser. Omit
`probe` if you only want to refresh on explicit `cache.refresh(...)` or
`cache.invalidate(...)` calls. Subscribe via `cache.subscribe(listener)`
to observe `hit` / `miss` / `refreshed` / `invalidated` events.
