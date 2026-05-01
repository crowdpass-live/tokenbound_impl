//! # crowdpass-soroban-client
//!
//! A typed, ergonomic Rust client for interacting with deployed
//! [CrowdPass](https://github.com/crowdpass-live/tokenbound_impl) Soroban
//! contracts on the Stellar network.
//!
//! The crate is built around three pillars:
//!
//! 1. **Builder-style configuration** via [`SorobanContractClient::builder`]
//!    that lets callers wire in a Soroban RPC endpoint, a network passphrase,
//!    optional retry/simulation policy, and the addresses of deployed
//!    CrowdPass contracts.
//! 2. **Typed contract wrappers** for the major CrowdPass contracts
//!    (event manager, ticket factory, ticket NFT, TBA registry, TBA account,
//!    marketplace, POAP NFT). Each wrapper exposes contract methods as
//!    `async` Rust functions returning native Rust types.
//! 3. **Transport abstraction** through the [`Transport`] trait. Downstream
//!    apps plug in their own JSON-RPC, gRPC, or in-process transport, while
//!    tests can rely on [`MockTransport`] to drive the client without any
//!    network or sandbox setup.
//!
//! ## Example
//!
//! ```no_run
//! use crowdpass_soroban_client::{
//!     SorobanContractClient, RpcConfig, NetworkPassphrase, ContractAddresses,
//!     transport::MockTransport,
//! };
//! use std::sync::Arc;
//!
//! # async fn run() -> Result<(), crowdpass_soroban_client::ClientError> {
//! let transport = Arc::new(MockTransport::new());
//! let client = SorobanContractClient::builder()
//!     .rpc(RpcConfig::new("https://soroban-testnet.stellar.org"))
//!     .network_passphrase(NetworkPassphrase::testnet())
//!     .contracts(
//!         ContractAddresses::builder()
//!             .event_manager("CA...EVT")
//!             .ticket_factory("CA...TFT")
//!             .build(),
//!     )
//!     .transport(transport)
//!     .build()?;
//!
//! let count = client.event_manager().get_event_count().await?;
//! println!("events on chain: {count}");
//! # Ok(()) }
//! ```
//!
//! ## Crate layout
//!
//! - [`client`] – the [`SorobanContractClient`] entry point and builder.
//! - [`config`] – RPC endpoint configuration, retry policy, network passphrases.
//! - [`contracts`] – per-contract typed wrappers.
//! - [`error`] – domain-specific [`ClientError`] enum.
//! - [`transport`] – the [`Transport`] trait plus a [`MockTransport`] for
//!   testing.
//! - [`types`] – shared domain types (addresses, scalars, contract values).

#![deny(missing_docs)]
#![deny(unsafe_code)]
#![cfg_attr(docsrs, feature(doc_cfg))]

pub mod client;
pub mod config;
pub mod contracts;
pub mod error;
pub mod transport;
pub mod types;

pub use crate::client::{ContractAddresses, SorobanContractClient, SorobanContractClientBuilder};
pub use crate::config::{NetworkPassphrase, RetryPolicy, RpcConfig};
pub use crate::error::ClientError;
pub use crate::transport::{InvocationRequest, InvocationResponse, MockTransport, Transport};
pub use crate::types::{
    Address, ContractValue, EventInfo, ListingInfo, PoapMetadata, SaleInfo, TicketMetadata,
    TicketTier, TierConfig,
};

/// Convenient `Result` alias used across the crate.
pub type Result<T> = core::result::Result<T, ClientError>;
