//! Typed wrapper for the [`ticket_factory`] contract.

use std::sync::Arc;

use crate::client::ClientInner;
use crate::error::ClientError;
use crate::transport::{InvocationRequest, InvocationResponse};
use crate::types::{Address, ContractValue};

use super::dispatch;

const CONTRACT_NAME: &str = "ticket_factory";

/// Typed client for the Ticket Factory contract.
pub struct TicketFactoryClient {
    inner: Arc<ClientInner>,
}

impl TicketFactoryClient {
    pub(crate) fn new(inner: Arc<ClientInner>) -> Self {
        Self { inner }
    }

    fn address(&self) -> Result<Address, ClientError> {
        self.inner
            .addresses
            .ticket_factory
            .clone()
            .ok_or(ClientError::MissingField("contracts.ticket_factory"))
    }

    /// Deploy a new Ticket NFT contract instance.
    pub async fn deploy_ticket(
        &self,
        minter: impl Into<Address>,
        salt: [u8; 32],
    ) -> Result<Address, ClientError> {
        let req = InvocationRequest::submit(CONTRACT_NAME, self.address()?, "deploy_ticket")
            .arg(ContractValue::address(minter))
            .arg(ContractValue::bytes_n32(&salt));
        let resp = dispatch(&self.inner, req).await?;
        decode_address(resp, "deploy_ticket")
    }

    /// Look up the contract address for an event.
    pub async fn get_ticket_contract(
        &self,
        event_id: u32,
    ) -> Result<Option<Address>, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_ticket_contract")
            .arg(event_id);
        let resp = dispatch(&self.inner, req).await?;
        match resp.return_value {
            Some(ContractValue::Option(Some(boxed))) => match *boxed {
                ContractValue::Address(addr) => Ok(Some(addr)),
                other => Err(ClientError::decode(format!(
                    "expected address, got {other:?}"
                ))),
            },
            Some(ContractValue::Option(None)) | Some(ContractValue::Void) | None => Ok(None),
            Some(ContractValue::Address(addr)) => Ok(Some(addr)),
            Some(other) => Err(ClientError::decode(format!(
                "expected optional address, got {other:?}"
            ))),
        }
    }

    /// Total ticket contracts deployed so far.
    pub async fn get_total_tickets(&self) -> Result<u32, ClientError> {
        let req =
            InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_total_tickets");
        let resp = dispatch(&self.inner, req).await?;
        resp.return_value
            .and_then(|v| v.as_u32())
            .ok_or_else(|| ClientError::decode("expected u32 from get_total_tickets"))
    }

    /// Read the configured admin.
    pub async fn get_admin(&self) -> Result<Address, ClientError> {
        let req = InvocationRequest::simulate(CONTRACT_NAME, self.address()?, "get_admin");
        let resp = dispatch(&self.inner, req).await?;
        decode_address(resp, "get_admin")
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
        .ok_or_else(|| ClientError::decode(format!("{method}: expected address response")))
}
