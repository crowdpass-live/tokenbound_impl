//! Typed wrapper around the [`event_manager`] Soroban contract.

use std::sync::Arc;

use crate::client::ClientInner;
use crate::error::ClientError;
use crate::transport::{InvocationRequest, InvocationResponse};
use crate::types::{Address, ContractValue, EventInfo, TicketTier, TierConfig};

use super::{dispatch, ContractContext};

const CONTRACT_NAME: &str = "event_manager";

/// Typed client for the Event Manager contract.
pub struct EventManagerClient {
    ctx: ContractContext,
}

impl EventManagerClient {
    pub(crate) fn new(inner: Arc<ClientInner>) -> Self {
        Self {
            ctx: ContractContext::new(inner),
        }
    }

    fn address(&self) -> Result<Address, ClientError> {
        self.ctx
            .inner
            .addresses
            .event_manager
            .clone()
            .ok_or(ClientError::MissingField("contracts.event_manager"))
    }

    fn build(&self, method: &'static str, submit: bool) -> Result<InvocationRequest, ClientError> {
        let addr = self.address()?;
        Ok(if submit {
            InvocationRequest::submit(CONTRACT_NAME, addr, method)
        } else {
            InvocationRequest::simulate(CONTRACT_NAME, addr, method)
        })
    }

    async fn dispatch(
        &self,
        req: InvocationRequest,
    ) -> Result<InvocationResponse, ClientError> {
        dispatch(&self.ctx.inner, req).await
    }

    /// Initialize the contract. Submits a transaction signed by `admin`.
    pub async fn initialize(
        &self,
        admin: impl Into<Address>,
        ticket_factory: impl Into<Address>,
    ) -> Result<(), ClientError> {
        let req = self
            .build("initialize", true)?
            .arg(ContractValue::address(admin))
            .arg(ContractValue::address(ticket_factory));
        self.dispatch(req).await?;
        Ok(())
    }

    /// Create an event with default (single) tier configuration.
    #[allow(clippy::too_many_arguments)]
    pub async fn create_event(
        &self,
        organizer: impl Into<Address>,
        theme: impl Into<String>,
        event_type: impl Into<String>,
        start_date: u64,
        end_date: u64,
        ticket_price: i128,
        total_tickets: u128,
        payment_token: impl Into<Address>,
    ) -> Result<u32, ClientError> {
        let req = self
            .build("create_event", true)?
            .arg(ContractValue::address(organizer))
            .arg(ContractValue::string(theme))
            .arg(ContractValue::string(event_type))
            .arg(start_date)
            .arg(end_date)
            .arg(ticket_price)
            .arg(total_tickets)
            .arg(ContractValue::address(payment_token));
        let resp = self.dispatch(req).await?;
        decode_u32(resp, "create_event")
    }

    /// Create an event with explicit tier configuration.
    #[allow(clippy::too_many_arguments)]
    pub async fn create_event_with_tiers(
        &self,
        organizer: impl Into<Address>,
        theme: impl Into<String>,
        event_type: impl Into<String>,
        start_date: u64,
        end_date: u64,
        ticket_price: i128,
        total_tickets: u128,
        payment_token: impl Into<Address>,
        tiers: Vec<TierConfig>,
    ) -> Result<u32, ClientError> {
        let tiers_value = ContractValue::vec(tiers.into_iter().map(|t| {
            ContractValue::map([
                ("name", ContractValue::string(t.name)),
                ("price", ContractValue::I128(t.price)),
                ("total_quantity", ContractValue::U128(t.total_quantity)),
            ])
        }));

        let params = ContractValue::map([
            ("organizer", ContractValue::address(organizer)),
            ("theme", ContractValue::string(theme)),
            ("event_type", ContractValue::string(event_type)),
            ("start_date", ContractValue::U64(start_date)),
            ("end_date", ContractValue::U64(end_date)),
            ("ticket_price", ContractValue::I128(ticket_price)),
            ("total_tickets", ContractValue::U128(total_tickets)),
            ("payment_token", ContractValue::address(payment_token)),
            ("tiers", tiers_value),
        ]);

        let req = self.build("create_event_with_tiers", true)?.arg(params);
        let resp = self.dispatch(req).await?;
        decode_u32(resp, "create_event_with_tiers")
    }

    /// Purchase one ticket of a given tier.
    pub async fn purchase_ticket(
        &self,
        buyer: impl Into<Address>,
        event_id: u32,
        tier_index: u32,
    ) -> Result<(), ClientError> {
        let req = self
            .build("purchase_ticket", true)?
            .arg(ContractValue::address(buyer))
            .arg(event_id)
            .arg(tier_index);
        self.dispatch(req).await?;
        Ok(())
    }

    /// Purchase multiple tickets of a given tier in a single transaction.
    pub async fn purchase_tickets(
        &self,
        buyer: impl Into<Address>,
        event_id: u32,
        tier_index: u32,
        quantity: u128,
    ) -> Result<(), ClientError> {
        let req = self
            .build("purchase_tickets", true)?
            .arg(ContractValue::address(buyer))
            .arg(event_id)
            .arg(tier_index)
            .arg(quantity);
        self.dispatch(req).await?;
        Ok(())
    }

    /// Cancel an event. Must be signed by the organiser.
    pub async fn cancel_event(&self, event_id: u32) -> Result<(), ClientError> {
        let req = self.build("cancel_event", true)?.arg(event_id);
        self.dispatch(req).await?;
        Ok(())
    }

    /// Claim a refund as a buyer of a cancelled event.
    pub async fn claim_refund(
        &self,
        claimer: impl Into<Address>,
        event_id: u32,
    ) -> Result<(), ClientError> {
        let req = self
            .build("claim_refund", true)?
            .arg(ContractValue::address(claimer))
            .arg(event_id);
        self.dispatch(req).await?;
        Ok(())
    }

    /// Withdraw funds for a finished event.
    pub async fn withdraw_funds(&self, event_id: u32) -> Result<(), ClientError> {
        let req = self.build("withdraw_funds", true)?.arg(event_id);
        self.dispatch(req).await?;
        Ok(())
    }

    /// Read the total number of events.
    pub async fn get_event_count(&self) -> Result<u32, ClientError> {
        let req = self.build("get_event_count", false)?;
        let resp = self.dispatch(req).await?;
        decode_u32(resp, "get_event_count")
    }

    /// Read a single event's details.
    pub async fn get_event(&self, event_id: u32) -> Result<EventInfo, ClientError> {
        let req = self.build("get_event", false)?.arg(event_id);
        let resp = self.dispatch(req).await?;
        decode_event_info(resp)
    }

    /// Read tier configuration for an event.
    pub async fn get_event_tiers(&self, event_id: u32) -> Result<Vec<TicketTier>, ClientError> {
        let req = self.build("get_event_tiers", false)?.arg(event_id);
        let resp = self.dispatch(req).await?;
        let value = require_value(resp, "get_event_tiers")?;
        let items = value
            .as_vec()
            .ok_or_else(|| ClientError::decode("expected vec of tiers"))?;
        items.iter().map(decode_ticket_tier).collect()
    }
}

fn require_value(
    response: InvocationResponse,
    method: &'static str,
) -> Result<ContractValue, ClientError> {
    response
        .return_value
        .ok_or_else(|| ClientError::decode(format!("{method}: empty response")))
}

fn decode_u32(response: InvocationResponse, method: &'static str) -> Result<u32, ClientError> {
    let value = require_value(response, method)?;
    value
        .as_u32()
        .ok_or_else(|| ClientError::decode(format!("{method}: expected u32")))
}

fn decode_event_info(response: InvocationResponse) -> Result<EventInfo, ClientError> {
    let value = require_value(response, "get_event")?;
    let id = value
        .map_get("id")
        .and_then(ContractValue::as_u32)
        .ok_or_else(|| ClientError::decode("event.id missing"))?;
    let organizer = value
        .map_get("organizer")
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode("event.organizer missing"))?;
    let theme = value
        .map_get("theme")
        .and_then(ContractValue::as_str)
        .ok_or_else(|| ClientError::decode("event.theme missing"))?
        .to_string();
    let event_type = value
        .map_get("event_type")
        .and_then(ContractValue::as_str)
        .ok_or_else(|| ClientError::decode("event.event_type missing"))?
        .to_string();
    let total_tickets = value
        .map_get("total_tickets")
        .and_then(ContractValue::as_u128)
        .ok_or_else(|| ClientError::decode("event.total_tickets missing"))?;
    let tickets_sold = value
        .map_get("tickets_sold")
        .and_then(ContractValue::as_u128)
        .ok_or_else(|| ClientError::decode("event.tickets_sold missing"))?;
    let ticket_price = value
        .map_get("ticket_price")
        .and_then(ContractValue::as_i128)
        .ok_or_else(|| ClientError::decode("event.ticket_price missing"))?;
    let start_date = value
        .map_get("start_date")
        .and_then(ContractValue::as_u64)
        .ok_or_else(|| ClientError::decode("event.start_date missing"))?;
    let end_date = value
        .map_get("end_date")
        .and_then(ContractValue::as_u64)
        .ok_or_else(|| ClientError::decode("event.end_date missing"))?;
    let is_canceled = value
        .map_get("is_canceled")
        .and_then(ContractValue::as_bool)
        .ok_or_else(|| ClientError::decode("event.is_canceled missing"))?;
    let ticket_nft_addr = value
        .map_get("ticket_nft_addr")
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode("event.ticket_nft_addr missing"))?;
    let payment_token = value
        .map_get("payment_token")
        .and_then(ContractValue::as_address)
        .cloned()
        .ok_or_else(|| ClientError::decode("event.payment_token missing"))?;

    Ok(EventInfo {
        id,
        organizer,
        theme,
        event_type,
        total_tickets,
        tickets_sold,
        ticket_price,
        start_date,
        end_date,
        is_canceled,
        ticket_nft_addr,
        payment_token,
    })
}

fn decode_ticket_tier(value: &ContractValue) -> Result<TicketTier, ClientError> {
    let name = value
        .map_get("name")
        .and_then(ContractValue::as_str)
        .ok_or_else(|| ClientError::decode("tier.name missing"))?
        .to_string();
    let price = value
        .map_get("price")
        .and_then(ContractValue::as_i128)
        .ok_or_else(|| ClientError::decode("tier.price missing"))?;
    let total_quantity = value
        .map_get("total_quantity")
        .and_then(ContractValue::as_u128)
        .ok_or_else(|| ClientError::decode("tier.total_quantity missing"))?;
    let sold_quantity = value
        .map_get("sold_quantity")
        .and_then(ContractValue::as_u128)
        .ok_or_else(|| ClientError::decode("tier.sold_quantity missing"))?;
    Ok(TicketTier {
        name,
        price,
        total_quantity,
        sold_quantity,
    })
}
