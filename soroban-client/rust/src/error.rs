//! Error types for the CrowdPass Soroban client.

use thiserror::Error;

/// Errors that can be returned from the client.
///
/// The variants are organised into three layers:
///
/// - **Configuration / builder errors** ([`ClientError::MissingField`],
///   [`ClientError::InvalidConfig`]) raised when the builder is misused.
/// - **Transport / RPC errors** ([`ClientError::Transport`],
///   [`ClientError::Timeout`], [`ClientError::Rpc`]) raised when the underlying
///   [`Transport`](crate::transport::Transport) fails.
/// - **Contract-domain errors** ([`ClientError::Contract`],
///   [`ClientError::DecodeError`], [`ClientError::Unauthorized`]) raised when
///   the on-chain contract returns a domain error or the response cannot be
///   parsed.
#[derive(Debug, Error)]
pub enum ClientError {
    /// A required builder field was not set.
    #[error("missing required field: {0}")]
    MissingField(&'static str),

    /// A field on the builder failed validation.
    #[error("invalid client configuration: {0}")]
    InvalidConfig(String),

    /// The transport returned an error while invoking a contract.
    #[error("transport error: {0}")]
    Transport(String),

    /// The configured timeout elapsed before the transport returned a result.
    #[error("operation timed out after {millis} ms")]
    Timeout {
        /// Configured timeout duration in milliseconds.
        millis: u64,
    },

    /// A JSON-RPC layer error returned by the Soroban RPC endpoint.
    #[error("rpc error {code}: {message}")]
    Rpc {
        /// JSON-RPC error code.
        code: i64,
        /// Human-readable error message.
        message: String,
    },

    /// The deployed contract returned a typed domain error.
    #[error("contract `{contract}` returned error code {code}: {message}")]
    Contract {
        /// Logical contract name (e.g. `"event_manager"`).
        contract: &'static str,
        /// The on-chain error code (matches the contract's `#[contracterror]`).
        code: u32,
        /// Human-readable description (best effort).
        message: String,
    },

    /// The simulator reported the transaction would fail.
    #[error("simulation failed: {0}")]
    SimulationFailed(String),

    /// A response or argument could not be encoded/decoded into the expected
    /// shape.
    #[error("failed to decode contract response: {0}")]
    DecodeError(String),

    /// The caller is not authorised to perform the requested action (e.g. the
    /// signer is not the configured admin / organiser).
    #[error("unauthorized: {0}")]
    Unauthorized(String),

    /// Catch-all for invariant violations within the client.
    #[error("client error: {0}")]
    Other(String),
}

impl ClientError {
    /// Convenience constructor for transport errors.
    pub fn transport<E: core::fmt::Display>(err: E) -> Self {
        Self::Transport(err.to_string())
    }

    /// Convenience constructor for decode errors.
    pub fn decode<E: core::fmt::Display>(err: E) -> Self {
        Self::DecodeError(err.to_string())
    }

    /// Convenience constructor for contract errors.
    pub fn contract(contract: &'static str, code: u32, message: impl Into<String>) -> Self {
        Self::Contract {
            contract,
            code,
            message: message.into(),
        }
    }
}
