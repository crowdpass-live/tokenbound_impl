//! Typed wrapper for the [`ticket_nft`] contract.

use std::sync::Arc;

use crate::client::ClientInner;
use crate::error::ClientError;
use crate::transport::{InvocationRequest, InvocationResponse};
use crate::types::{Address, ContractValue, TicketMetadata};

use super::dispatch;

const CONTRACT_NAME: &str = "ticket_nft";

/// Typed client for a Ticket NFT contract.
///
/// Each event deploys its own Ticket NFT contract, so callers must supply the
/// specific contract address.
pub struct TicketNftClient {
    inner: Arc<ClientInner>,
    address: Address,
}

impl TicketNftClient {
    pub(crate) fn with_address(inner: Arc<ClientInner>, address: Address) -> Self {
        Self { inner, address }
    }

    /// The specific Ticket NFT contract this client targets.
    pub fn address(&self) -> &Address {
        &self.address
    }

    /// Mint a single ticket NFT to `recipient`.
    pub async fn mint_ticket_nft(
        &self,
        recipient: impl Into<Address>,
    ) -> Result<u128, ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address.clone(), "mint_ticket_nft")
            .arg(ContractValue::address(recipient));
        let resp = dispatch(&self.inner, req).await?;
        decode_u128(resp, "mint_ticket_nft")
    }

    /// Read the off-chain `tokenURI` for a ticket.
    pub async fn token_uri(&self, token_id: u128) -> Result<String, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address.clone(), "token_uri")
            .arg(token_id);
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .as_ref()
            .and_then(ContractValue::as_str)
            .map(|s| s.to_string())
            .ok_or_else(|| ClientError::decode("expected string from token_uri"))
    }

    /// Read on-chain metadata for a ticket.
    pub async fn get_metadata(&self, token_id: u128) -> Result<TicketMetadata, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address.clone(), "get_metadata")
            .arg(token_id);
        let resp = dispatch(&self.inner, req).await?;
        decode_metadata(resp)
    }

    /// Owner of a ticket.
    pub async fn owner_of(&self, token_id: u128) -> Result<Address, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address.clone(), "owner_of")
            .arg(token_id);
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .as_ref()
            .and_then(ContractValue::as_address)
            .cloned()
            .ok_or_else(|| ClientError::decode("expected address from owner_of"))
    }

    /// Token balance for `owner`.
    pub async fn balance_of(&self, owner: impl Into<Address>) -> Result<u128, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address.clone(), "balance_of")
            .arg(ContractValue::address(owner));
        let resp = dispatch(&self.inner, req).await?;
        decode_u128(resp, "balance_of")
    }

    /// Transfer a ticket between accounts.
    pub async fn transfer_from(
        &self,
        from: impl Into<Address>,
        to: impl Into<Address>,
        token_id: u128,
    ) -> Result<(), ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address.clone(), "transfer_from")
            .arg(ContractValue::address(from))
            .arg(ContractValue::address(to))
            .arg(token_id);
        dispatch(&self.inner, req).await?;
        Ok(())
    }

    /// Burn a ticket.
    pub async fn burn(&self, token_id: u128) -> Result<(), ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address.clone(), "burn")
            .arg(token_id);
        dispatch(&self.inner, req).await?;
        Ok(())
    }
}

fn decode_u128(response: InvocationResponse, method: &'static str) -> Result<u128, ClientError> {
    response
        .return_value
        .as_ref()
        .and_then(ContractValue::as_u128)
        .ok_or_else(|| ClientError::decode(format!("{method}: expected u128")))
}

fn decode_metadata(response: InvocationResponse) -> Result<TicketMetadata, ClientError> {
    let value = response
        .return_value
        .ok_or_else(|| ClientError::decode("get_metadata returned void"))?;
    let name = value
        .map_get("name")
        .and_then(ContractValue::as_str)
        .ok_or_else(|| ClientError::decode("metadata.name missing"))?
        .to_string();
    let description = value
        .map_get("description")
        .and_then(ContractValue::as_str)
        .ok_or_else(|| ClientError::decode("metadata.description missing"))?
        .to_string();
    let image = value
        .map_get("image")
        .and_then(ContractValue::as_str)
        .ok_or_else(|| ClientError::decode("metadata.image missing"))?
        .to_string();
    let event_id = value
        .map_get("event_id")
        .and_then(ContractValue::as_u32)
        .ok_or_else(|| ClientError::decode("metadata.event_id missing"))?;
    let tier = value
        .map_get("tier")
        .and_then(ContractValue::as_str)
        .ok_or_else(|| ClientError::decode("metadata.tier missing"))?
        .to_string();
    Ok(TicketMetadata {
        name,
        description,
        image,
        event_id,
        tier,
    })
}
