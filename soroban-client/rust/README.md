# crowdpass-soroban-client

A typed, ergonomic Rust client for interacting with deployed
[CrowdPass](https://github.com/crowdpass-live/tokenbound_impl) Soroban
contracts on the Stellar network.

The crate is intentionally **transport-agnostic**: it focuses on encoding
arguments, decoding responses, retry/timeout policy, and clean error mapping.
You plug in your own RPC implementation (or the bundled `MockTransport` for
tests) via the `Transport` trait.

## Features

- `SorobanContractClient` builder with RPC endpoint, network passphrase, and
  per-contract address configuration.
- Typed wrappers for every major CrowdPass contract:
  - `EventManagerClient` — events, tiers, refunds, withdrawals.
  - `TicketFactoryClient` — deploy / look up per-event ticket NFT contracts.
  - `TicketNftClient` — mint, transfer, burn, metadata reads.
  - `TbaRegistryClient` / `TbaAccountClient` — token-bound accounts.
  - `MarketplaceClient` — listings, sales, history.
  - `PoapNftClient` — POAP minting and minter lookup.
- Async first via `tokio` with configurable timeouts and an exponential-backoff
  retry policy.
- Domain-mapped `ClientError` covering builder, transport, RPC, simulation,
  decode, and contract-level errors.
- `MockTransport` for unit / integration tests — exercises the full encode /
  dispatch / decode pipeline with no network.

## Adding to your project

```toml
# Cargo.toml
[dependencies]
crowdpass-soroban-client = { path = "../soroban-client/rust" }
tokio = { version = "1", features = ["full"] }
```

When this crate is published to crates.io, replace the `path = ...` entry with
a normal version string.

## Quickstart

```rust,no_run
use std::sync::Arc;

use crowdpass_soroban_client::{
    ContractAddresses, NetworkPassphrase, RpcConfig, SorobanContractClient,
    transport::MockTransport,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // For production, swap MockTransport for your own JSON-RPC transport.
    let transport = Arc::new(MockTransport::new());

    let client = SorobanContractClient::builder()
        .rpc(RpcConfig::new("https://soroban-testnet.stellar.org"))
        .network_passphrase(NetworkPassphrase::testnet())
        .contracts(
            ContractAddresses::builder()
                .event_manager("CDXXXEVT...")
                .ticket_factory("CDXXXTFT...")
                .marketplace("CDXXXMKT...")
                .poap_nft("CDXXXPOAP...")
                .tba_registry("CDXXXTBA...")
                .build(),
        )
        .transport(transport)
        .build()?;

    let total = client.event_manager().get_event_count().await?;
    println!("events on chain: {total}");

    Ok(())
}
```

## Plugging in a real RPC transport

Implement the `Transport` trait against your favourite Soroban RPC client
(e.g. `reqwest` + `stellar_xdr`). Each invocation is described by an
`InvocationRequest` (contract id, method symbol, typed args, and whether to
simulate or submit) and you return an `InvocationResponse`.

```rust,ignore
use async_trait::async_trait;
use crowdpass_soroban_client::transport::{
    InvocationRequest, InvocationResponse, Transport,
};
use crowdpass_soroban_client::ClientError;

struct JsonRpcTransport { /* http client, signer, ... */ }

#[async_trait]
impl Transport for JsonRpcTransport {
    async fn invoke(&self, request: InvocationRequest)
        -> Result<InvocationResponse, ClientError>
    {
        // 1. Encode `request.args` as XDR ScVals.
        // 2. Build a Soroban operation targeting `request.contract_id`.
        // 3. Either simulateTransaction (Simulate) or sendTransaction (Submit).
        // 4. Decode the return ScVal into a `ContractValue`.
        // 5. Map errors onto `ClientError`.
        todo!()
    }
}
```

## Testing strategy

The crate ships a `MockTransport` that behaves like a local sandbox: register
handlers per `(contract_id, method)`, drive the typed clients normally, and
inspect the recorded invocation log.

```rust,no_run
use std::sync::Arc;
use crowdpass_soroban_client::{
    ContractAddresses, ContractValue, RpcConfig, SorobanContractClient,
    transport::MockTransport, InvocationResponse,
};

# async fn run() -> Result<(), Box<dyn std::error::Error>> {
let transport = Arc::new(MockTransport::new());
transport.register("CEVT", "get_event_count", |_req| {
    Ok(InvocationResponse::value(ContractValue::U32(7)))
});

let client = SorobanContractClient::builder()
    .rpc(RpcConfig::new("https://rpc.example"))
    .contracts(ContractAddresses::builder().event_manager("CEVT").build())
    .transport(transport.clone())
    .build()?;

assert_eq!(client.event_manager().get_event_count().await?, 7);
assert_eq!(transport.invocations().len(), 1);
# Ok(()) }
```

The integration tests in [`tests/`](./tests) cover this pattern end-to-end for
every wrapped contract, plus retry/backoff and timeout behaviour.

## Verifying the crate

From this directory:

```bash
cargo test
cargo clippy -- -D warnings
cargo doc --no-deps
```

## Layout

```
soroban-client/rust/
├── Cargo.toml
├── README.md
├── src/
│   ├── client.rs           # SorobanContractClient + builder
│   ├── config.rs           # RpcConfig, RetryPolicy, NetworkPassphrase
│   ├── contracts/          # typed contract wrappers
│   ├── error.rs            # ClientError enum
│   ├── lib.rs
│   ├── transport/          # Transport trait + MockTransport
│   └── types.rs            # Address, ContractValue, domain types
└── tests/                  # async integration tests
```

## License

Dual-licensed under MIT or Apache-2.0.
