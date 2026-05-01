//! Typed wrapper for the [`poap_nft`] contract.

use std::sync::Arc;

use crate::client::ClientInner;
use crate::error::ClientError;
use crate::transport::{InvocationRequest, InvocationResponse};
use crate::types::{Address, ContractValue, PoapMetadata};

use super::dispatch;

const CONTRACT_NAME: &str = "poap_nft";

/// Typed client for the POAP NFT contract.
pub struct PoapNftClient {
    inner: Arc<ClientInner>,
}

impl PoapNftClient {
    pub(crate) fn new(inner: Arc<ClientInner>) -> Self {
        Self { inner }
    }

    fn address(&self) -> Result<Address, ClientError> {
        self.inner
            .addresses
            .poap_nft
            .clone()
            .ok_or(ClientError::MissingField("contracts.poap_nft"))
    }

    /// Mint a POAP for `recipient`.
    pub async fn mint_poap(
        &self,
        recipient: impl Into<Address>,
        metadata: PoapMetadata,
    ) -> Result<u128, ClientError> {
        let metadata_value = ContractValue::map([
            ("event_id", ContractValue::U32(metadata.event_id)),
            ("name", ContractValue::string(metadata.name)),
            ("description", ContractValue::string(metadata.description)),
            ("image", ContractValue::string(metadata.image)),
            ("issued_at", ContractValue::U64(metadata.issued_at)),
        ]);
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address()?, "mint_poap")
            .arg(ContractValue::address(recipient))
            .arg(metadata_value);
        let resp = dispatch(&self.inner, req).await?;
        decode_u128(resp, "mint_poap")
    }

    /// Read the configured minter.
    pub async fn get_minter(&self) -> Result<Address, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_minter");
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .as_ref()
            .and_then(ContractValue::as_address)
            .cloned()
            .ok_or_else(|| ClientError::decode("expected address from get_minter"))
    }
}

fn decode_u128(response: InvocationResponse, method: &'static str) -> Result<u128, ClientError> {
    response
        .return_value
        .as_ref()
        .and_then(ContractValue::as_u128)
        .ok_or_else(|| ClientError::decode(format!("{method}: expected u128")))
}
