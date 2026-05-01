//! Transport abstraction.
//!
//! The client never speaks directly to a network — instead, every contract
//! call is dispatched through an implementation of the [`Transport`] trait.
//! Downstream apps wire in their own JSON-RPC client (e.g. `reqwest` +
//! `stellar_xdr`), and tests can use the in-memory [`MockTransport`] supplied
//! by this crate.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::ClientError;
use crate::types::{Address, ContractValue};

mod mock;

pub use self::mock::{MockHandler, MockTransport};

/// Whether the call should be simulated (read-only) or submitted as a
/// transaction.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum InvocationKind {
    /// Read-only simulation. The transport must not submit a transaction.
    Simulate,
    /// Submit and confirm a transaction.
    Submit,
}

/// A single contract invocation request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationRequest {
    /// Logical contract name (used for richer error reporting only).
    pub contract_name: &'static str,
    /// Address of the deployed contract.
    pub contract_id: Address,
    /// Contract method name (a Soroban `Symbol`).
    pub method: String,
    /// Arguments in declaration order.
    pub args: Vec<ContractValue>,
    /// Whether to simulate or submit.
    pub kind: InvocationKind,
    /// Optional caller (source) account used for simulation / authorisation.
    pub caller: Option<Address>,
}

impl InvocationRequest {
    /// Helper to build a new simulation request.
    pub fn simulate(
        contract_name: &'static str,
        contract_id: Address,
        method: impl Into<String>,
    ) -> Self {
        Self {
            contract_name,
            contract_id,
            method: method.into(),
            args: Vec::new(),
            kind: InvocationKind::Simulate,
            caller: None,
        }
    }

    /// Helper to build a new submission request.
    pub fn submit(
        contract_name: &'static str,
        contract_id: Address,
        method: impl Into<String>,
    ) -> Self {
        Self {
            contract_name,
            contract_id,
            method: method.into(),
            args: Vec::new(),
            kind: InvocationKind::Submit,
            caller: None,
        }
    }

    /// Append a single argument.
    pub fn arg(mut self, value: impl Into<ContractValue>) -> Self {
        self.args.push(value.into());
        self
    }

    /// Append multiple arguments at once.
    pub fn args(mut self, values: impl IntoIterator<Item = ContractValue>) -> Self {
        self.args.extend(values);
        self
    }

    /// Attach a caller (source) address.
    pub fn with_caller(mut self, caller: impl Into<Address>) -> Self {
        self.caller = Some(caller.into());
        self
    }
}

/// Response returned from a transport invocation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvocationResponse {
    /// Decoded contract return value. `None` for void-returning calls.
    pub return_value: Option<ContractValue>,
    /// Optional transaction hash for `Submit` invocations.
    pub tx_hash: Option<String>,
    /// Optional ledger sequence at which the transaction was applied.
    pub ledger: Option<u64>,
    /// Optional list of events emitted by the contract.
    #[serde(default)]
    pub events: Vec<ContractEvent>,
}

impl InvocationResponse {
    /// Build a successful response carrying `value`.
    pub fn value(value: ContractValue) -> Self {
        Self {
            return_value: Some(value),
            tx_hash: None,
            ledger: None,
            events: Vec::new(),
        }
    }

    /// Build a successful void response (returns `()`).
    pub fn void() -> Self {
        Self {
            return_value: None,
            tx_hash: None,
            ledger: None,
            events: Vec::new(),
        }
    }
}

/// Decoded contract event emitted as a side effect of an invocation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContractEvent {
    /// Address of the contract that emitted the event.
    pub contract_id: Address,
    /// Event topic symbols.
    pub topics: Vec<String>,
    /// Event payload.
    pub data: ContractValue,
}

/// The trait that bridges the typed client to a concrete RPC backend.
///
/// Implementations may be sync-over-async (e.g. forwarding to a JSON-RPC
/// client) or fully in-process (e.g. tests). The trait is object-safe so the
/// client stores it as `Arc<dyn Transport>`.
#[async_trait]
pub trait Transport: Send + Sync + 'static {
    /// Execute the given invocation, returning the decoded response.
    async fn invoke(&self, request: InvocationRequest) -> Result<InvocationResponse, ClientError>;
}

#[async_trait]
impl<T> Transport for std::sync::Arc<T>
where
    T: Transport + ?Sized,
{
    async fn invoke(&self, request: InvocationRequest) -> Result<InvocationResponse, ClientError> {
        T::invoke(self.as_ref(), request).await
    }
}
