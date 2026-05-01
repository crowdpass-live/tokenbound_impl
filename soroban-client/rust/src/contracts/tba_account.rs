//! Typed wrapper for the [`tba_account`] contract.

use std::sync::Arc;

use crate::client::ClientInner;
use crate::error::ClientError;
use crate::transport::InvocationRequest;
use crate::types::{Address, ContractValue};

use super::dispatch;

const CONTRACT_NAME: &str = "tba_account";

/// Typed client for a TBA Account contract instance.
pub struct TbaAccountClient {
    inner: Arc<ClientInner>,
    address: Address,
}

impl TbaAccountClient {
    pub(crate) fn with_address(inner: Arc<ClientInner>, address: Address) -> Self {
        Self { inner, address }
    }

    /// Address of the TBA this client targets.
    pub fn address(&self) -> &Address {
        &self.address
    }

    /// Read the bound NFT contract.
    pub async fn token_contract(&self) -> Result<Address, ClientError> {
        let req =
            InvocationRequest::simulate(CONTRACT_NAME, self.address.clone(), "token_contract");
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .as_ref()
            .and_then(ContractValue::as_address)
            .cloned()
            .ok_or_else(|| ClientError::decode("expected address from token_contract"))
    }

    /// Read the bound NFT token id.
    pub async fn token_id(&self) -> Result<u128, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address.clone(), "token_id");
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .and_then(|v| v.as_u128())
            .ok_or_else(|| ClientError::decode("expected u128 from token_id"))
    }

    /// Resolve the current owner of the bound NFT (and therefore of this TBA).
    pub async fn owner(&self) -> Result<Address, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address.clone(), "owner");
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .as_ref()
            .and_then(ContractValue::as_address)
            .cloned()
            .ok_or_else(|| ClientError::decode("expected address from owner"))
    }

    /// Current execution nonce.
    pub async fn nonce(&self) -> Result<u64, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address.clone(), "nonce");
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .and_then(|v| v.as_u64())
            .ok_or_else(|| ClientError::decode("expected u64 from nonce"))
    }

    /// Execute a transaction from this TBA against another contract.
    pub async fn execute(
        &self,
        to: impl Into<Address>,
        func: impl Into<String>,
        args: Vec<ContractValue>,
    ) -> Result<Vec<ContractValue>, ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address.clone(), "execute")
            .arg(ContractValue::address(to))
            .arg(ContractValue::symbol(func))
            .arg(ContractValue::vec(args));
        let resp = dispatch(&self.inner, req).await?;
        match resp.return_value {
            Some(ContractValue::Vec(items)) => Ok(items),
            Some(other) => Err(ClientError::decode(format!(
                "expected vec from execute, got {other:?}"
            ))),
            None => Ok(Vec::new()),
        }
    }
}
