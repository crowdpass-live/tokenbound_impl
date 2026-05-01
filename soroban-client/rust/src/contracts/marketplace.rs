//! Typed wrapper for the [`marketplace`] contract.

use std::sync::Arc;

use crate::client::ClientInner;
use crate::error::ClientError;
use crate::transport::{InvocationRequest, InvocationResponse};
use crate::types::{Address, ContractValue, ListingInfo, SaleInfo};

use super::dispatch;

const CONTRACT_NAME: &str = "marketplace";

/// Typed client for the Marketplace contract.
pub struct MarketplaceClient {
    inner: Arc<ClientInner>,
}

impl MarketplaceClient {
    pub(crate) fn new(inner: Arc<ClientInner>) -> Self {
        Self { inner }
    }

    fn address(&self) -> Result<Address, ClientError> {
        self.inner
            .addresses
            .marketplace
            .clone()
            .ok_or(ClientError::MissingField("contracts.marketplace"))
    }

    /// Create a listing.
    pub async fn create_listing(
        &self,
        seller: impl Into<Address>,
        ticket_contract: impl Into<Address>,
        token_id: i128,
        price: i128,
    ) -> Result<u32, ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address()?, "create_listing")
            .arg(ContractValue::address(seller))
            .arg(ContractValue::address(ticket_contract))
            .arg(token_id)
            .arg(price);
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .and_then(|v| v.as_u32())
            .ok_or_else(|| ClientError::decode("expected u32 listing id"))
    }

    /// Purchase a listing.
    pub async fn purchase_ticket(
        &self,
        buyer: impl Into<Address>,
        listing_id: u32,
    ) -> Result<(), ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address()?, "purchase_ticket")
            .arg(ContractValue::address(buyer))
            .arg(listing_id);
        dispatch(&self.inner, req).await?;
        Ok(())
    }

    /// Cancel a listing.
    pub async fn cancel_listing(
        &self,
        seller: impl Into<Address>,
        listing_id: u32,
    ) -> Result<(), ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address()?, "cancel_listing")
            .arg(ContractValue::address(seller))
            .arg(listing_id);
        dispatch(&self.inner, req).await?;
        Ok(())
    }

    /// Read a listing by id.
    pub async fn get_listing(
        &self,
        listing_id: u32,
    ) -> Result<Option<ListingInfo>, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_listing")
            .arg(listing_id);
        let resp = dispatch(&self.inner, req).await?;
        match resp.return_value {
            Some(ContractValue::Option(None)) | Some(ContractValue::Void) | None => Ok(None),
            Some(ContractValue::Option(Some(boxed))) => decode_listing(*boxed).map(Some),
            Some(value) => decode_listing(value).map(Some),
        }
    }

    /// Page through active listings.
    pub async fn get_active_listings(
        &self,
        start: u32,
        limit: u32,
    ) -> Result<Vec<ListingInfo>, ClientError> {
        let req =
            InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_active_listings")
                .arg(start)
                .arg(limit);
        let resp = dispatch(&self.inner, req).await?;
        decode_listings(resp)
    }

    /// Read a seller's listings (optionally only the active ones).
    pub async fn get_seller_listings(
        &self,
        seller: impl Into<Address>,
        active_only: bool,
    ) -> Result<Vec<ListingInfo>, ClientError> {
        let req =
            InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_seller_listings")
                .arg(ContractValue::address(seller))
                .arg(active_only);
        let resp = dispatch(&self.inner, req).await?;
        decode_listings(resp)
    }

    /// Read the historical sales involving `user`.
    pub async fn get_user_transactions(
        &self,
        user: impl Into<Address>,
    ) -> Result<Vec<SaleInfo>, ClientError> {
        let req =
            InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_user_transactions")
                .arg(ContractValue::address(user));
        let resp = dispatch(&self.inner, req).await?;
        decode_sales(resp)
    }
}

fn decode_listings(response: InvocationResponse) -> Result<Vec<ListingInfo>, ClientError> {
    let value = response
        .return_value
        .ok_or_else(|| ClientError::decode("expected vec of listings"))?;
    let items = value
        .as_vec()
        .ok_or_else(|| ClientError::decode("expected vec of listings"))?;
    items.iter().cloned().map(decode_listing).collect()
}

fn decode_sales(response: InvocationResponse) -> Result<Vec<SaleInfo>, ClientError> {
    let value = response
        .return_value
        .ok_or_else(|| ClientError::decode("expected vec of sales"))?;
    let items = value
        .as_vec()
        .ok_or_else(|| ClientError::decode("expected vec of sales"))?;
    items.iter().cloned().map(decode_sale).collect()
}

fn decode_listing(value: ContractValue) -> Result<ListingInfo, ClientError> {
    let seller = value
        .map_get("seller")
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode("listing.seller missing"))?;
    let ticket_contract = value
        .map_get("ticket_contract")
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode("listing.ticket_contract missing"))?;
    let token_id = value
        .map_get("token_id")
        .and_then(ContractValue::as_i128)
        .ok_or_else(|| ClientError::decode("listing.token_id missing"))?;
    let price = value
        .map_get("price")
        .and_then(ContractValue::as_i128)
        .ok_or_else(|| ClientError::decode("listing.price missing"))?;
    let active = value
        .map_get("active")
        .and_then(ContractValue::as_bool)
        .ok_or_else(|| ClientError::decode("listing.active missing"))?;
    let created_at = value
        .map_get("created_at")
        .and_then(ContractValue::as_u64)
        .ok_or_else(|| ClientError::decode("listing.created_at missing"))?;
    Ok(ListingInfo {
        seller,
        ticket_contract,
        token_id,
        price,
        active,
        created_at,
    })
}

fn decode_sale(value: ContractValue) -> Result<SaleInfo, ClientError> {
    let buyer = value
        .map_get("buyer")
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode("sale.buyer missing"))?;
    let seller = value
        .map_get("seller")
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode("sale.seller missing"))?;
    let ticket_contract = value
        .map_get("ticket_contract")
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode("sale.ticket_contract missing"))?;
    let token_id = value
        .map_get("token_id")
        .and_then(ContractValue::as_i128)
        .ok_or_else(|| ClientError::decode("sale.token_id missing"))?;
    let price = value
        .map_get("price")
        .and_then(ContractValue::as_i128)
        .ok_or_else(|| ClientError::decode("sale.price missing"))?;
    let timestamp = value
        .map_get("timestamp")
        .and_then(ContractValue::as_u64)
        .ok_or_else(|| ClientError::decode("sale.timestamp missing"))?;
    Ok(SaleInfo {
        buyer,
        seller,
        ticket_contract,
        token_id,
        price,
        timestamp,
    })
}
