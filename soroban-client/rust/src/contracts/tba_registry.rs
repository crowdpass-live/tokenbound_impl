//! Typed wrapper for the [`tba_registry`] contract.

use std::sync::Arc;

use crate::client::ClientInner;
use crate::error::ClientError;
use crate::transport::{InvocationRequest, InvocationResponse};
use crate::types::{Address, ContractValue};

use super::dispatch;

const CONTRACT_NAME: &str = "tba_registry";

/// Typed client for the TBA Registry contract.
pub struct TbaRegistryClient {
    inner: Arc<ClientInner>,
}

impl TbaRegistryClient {
    pub(crate) fn new(inner: Arc<ClientInner>) -> Self {
        Self { inner }
    }

    fn address(&self) -> Result<Address, ClientError> {
        self.inner
            .addresses
            .tba_registry
            .clone()
            .ok_or(ClientError::MissingField("contracts.tba_registry"))
    }

    /// Compute (or read, when already deployed) the deterministic TBA address.
    pub async fn get_account(
        &self,
        implementation_hash: [u8; 32],
        token_contract: impl Into<Address>,
        token_id: u128,
        salt: [u8; 32],
    ) -> Result<Address, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_account")
            .arg(ContractValue::bytes_n32(&implementation_hash))
            .arg(ContractValue::address(token_contract))
            .arg(token_id)
            .arg(ContractValue::bytes_n32(&salt));
        let resp = dispatch(&self.inner, req).await?;
        decode_address(resp, "get_account")
    }

    /// Deploy a new TBA account contract for the given NFT.
    pub async fn create_account(
        &self,
        implementation_hash: [u8; 32],
        token_contract: impl Into<Address>,
        token_id: u128,
        salt: [u8; 32],
    ) -> Result<Address, ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address()?, "create_account")
            .arg(ContractValue::bytes_n32(&implementation_hash))
            .arg(ContractValue::address(token_contract))
            .arg(token_id)
            .arg(ContractValue::bytes_n32(&salt));
        let resp = dispatch(&self.inner, req).await?;
        decode_address(resp, "create_account")
    }

    /// Number of TBAs deployed for a given NFT.
    pub async fn total_deployed_accounts(
        &self,
        token_contract: impl Into<Address>,
        token_id: u128,
    ) -> Result<u32, ClientError> {
        let req =
            InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "total_deployed_accounts")
                .arg(ContractValue::address(token_contract))
                .arg(token_id);
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .and_then(|v| v.as_u32())
            .ok_or_else(|| ClientError::decode("expected u32 from total_deployed_accounts"))
    }
}

fn decode_address(
    response: InvocationResponse,
    method: &'static str,
) -> Result<Address, ClientError> {
    response
        .return_value
        .as_ref()
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode(format!("{method}: expected address")))
}
