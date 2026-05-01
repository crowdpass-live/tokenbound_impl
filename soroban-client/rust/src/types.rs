//! Shared domain types used by the typed contract wrappers.
//!
//! These types intentionally mirror the on-chain shapes defined in the
//! `soroban-contract/` crates but use plain `std` types so they can flow into
//! external Rust apps without dragging in the `soroban-sdk` dependency.

use serde::{Deserialize, Serialize};

/// A Stellar Soroban contract or account address.
///
/// Stored as the canonical `G...` (account) or `C...` (contract) strkey
/// representation. The client does not parse the strkey — it is treated as an
/// opaque identifier and forwarded to the underlying transport.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Address(String);

impl Address {
    /// Wrap a strkey-encoded address.
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// Borrow the underlying strkey string.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Consume the address and return the inner string.
    pub fn into_string(self) -> String {
        self.0
    }
}

impl From<&str> for Address {
    fn from(value: &str) -> Self {
        Self::new(value)
    }
}

impl From<String> for Address {
    fn from(value: String) -> Self {
        Self::new(value)
    }
}

impl core::fmt::Display for Address {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str(&self.0)
    }
}

/// A polymorphic value used as a contract argument or return value.
///
/// The off-chain client must speak the SCVal vocabulary that Soroban contracts
/// expect. To avoid dragging in `stellar_xdr` for callers that do not need it,
/// this enum captures the small, well-typed subset CrowdPass contracts use.
/// Transports are responsible for converting to/from XDR.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ContractValue {
    /// `void` / `()` — the zero-argument value.
    Void,
    /// 32-bit unsigned integer.
    U32(u32),
    /// 64-bit unsigned integer.
    U64(u64),
    /// 128-bit unsigned integer.
    U128(u128),
    /// 128-bit signed integer (used for token amounts and ticket prices).
    I128(i128),
    /// Boolean flag.
    Bool(bool),
    /// UTF-8 string.
    String(String),
    /// Symbol (short, ASCII identifier — max 32 chars on Soroban).
    Symbol(String),
    /// Hex-encoded byte string.
    Bytes(String),
    /// 32-byte hash (hex-encoded).
    BytesN32(String),
    /// 64-byte signature (hex-encoded).
    BytesN64(String),
    /// Soroban address (account or contract).
    Address(Address),
    /// Optional value — `None` is encoded as the special `Void` sentinel.
    Option(Option<Box<ContractValue>>),
    /// Heterogeneous tuple.
    Tuple(Vec<ContractValue>),
    /// Homogeneous vector.
    Vec(Vec<ContractValue>),
    /// Map of named fields (used for `#[contracttype]` structs).
    Map(Vec<(String, ContractValue)>),
}

impl ContractValue {
    /// Build a [`ContractValue::Address`] from anything convertible to an
    /// [`Address`].
    pub fn address(addr: impl Into<Address>) -> Self {
        Self::Address(addr.into())
    }

    /// Build a [`ContractValue::String`] from anything convertible.
    pub fn string(value: impl Into<String>) -> Self {
        Self::String(value.into())
    }

    /// Build a [`ContractValue::Symbol`] from anything convertible.
    pub fn symbol(value: impl Into<String>) -> Self {
        Self::Symbol(value.into())
    }

    /// Build a [`ContractValue::Bytes`] from raw bytes.
    pub fn bytes(value: &[u8]) -> Self {
        Self::Bytes(hex::encode(value))
    }

    /// Build a [`ContractValue::BytesN32`] from a 32-byte array.
    pub fn bytes_n32(value: &[u8; 32]) -> Self {
        Self::BytesN32(hex::encode(value))
    }

    /// Build a [`ContractValue::BytesN64`] from a 64-byte array.
    pub fn bytes_n64(value: &[u8; 64]) -> Self {
        Self::BytesN64(hex::encode(value))
    }

    /// Build a vector value from an iterator.
    pub fn vec<I, V>(values: I) -> Self
    where
        I: IntoIterator<Item = V>,
        V: Into<ContractValue>,
    {
        Self::Vec(values.into_iter().map(Into::into).collect())
    }

    /// Build a map value from an iterator of (key, value) pairs.
    pub fn map<I, K, V>(entries: I) -> Self
    where
        I: IntoIterator<Item = (K, V)>,
        K: Into<String>,
        V: Into<ContractValue>,
    {
        Self::Map(
            entries
                .into_iter()
                .map(|(k, v)| (k.into(), v.into()))
                .collect(),
        )
    }

    /// If this value is a `U32`, return it.
    pub fn as_u32(&self) -> Option<u32> {
        if let Self::U32(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    /// If this value is a `U64`, return it.
    pub fn as_u64(&self) -> Option<u64> {
        if let Self::U64(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    /// If this value is a `U128`, return it.
    pub fn as_u128(&self) -> Option<u128> {
        if let Self::U128(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    /// If this value is an `I128`, return it.
    pub fn as_i128(&self) -> Option<i128> {
        if let Self::I128(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    /// If this value is a `Bool`, return it.
    pub fn as_bool(&self) -> Option<bool> {
        if let Self::Bool(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    /// If this value is a `String`, return a borrowed view.
    pub fn as_str(&self) -> Option<&str> {
        if let Self::String(v) | Self::Symbol(v) = self {
            Some(v.as_str())
        } else {
            None
        }
    }

    /// If this value is an `Address`, return a borrowed view.
    pub fn as_address(&self) -> Option<&Address> {
        if let Self::Address(addr) = self {
            Some(addr)
        } else {
            None
        }
    }

    /// If this value is a `Map`, lookup the named field.
    pub fn map_get(&self, key: &str) -> Option<&ContractValue> {
        if let Self::Map(entries) = self {
            entries
                .iter()
                .find_map(|(k, v)| if k == key { Some(v) } else { None })
        } else {
            None
        }
    }

    /// If this value is a `Vec`, borrow the underlying slice.
    pub fn as_vec(&self) -> Option<&[ContractValue]> {
        if let Self::Vec(items) = self {
            Some(items.as_slice())
        } else {
            None
        }
    }
}

impl From<u32> for ContractValue {
    fn from(value: u32) -> Self {
        Self::U32(value)
    }
}
impl From<u64> for ContractValue {
    fn from(value: u64) -> Self {
        Self::U64(value)
    }
}
impl From<u128> for ContractValue {
    fn from(value: u128) -> Self {
        Self::U128(value)
    }
}
impl From<i128> for ContractValue {
    fn from(value: i128) -> Self {
        Self::I128(value)
    }
}
impl From<bool> for ContractValue {
    fn from(value: bool) -> Self {
        Self::Bool(value)
    }
}
impl From<String> for ContractValue {
    fn from(value: String) -> Self {
        Self::String(value)
    }
}
impl From<&str> for ContractValue {
    fn from(value: &str) -> Self {
        Self::String(value.to_string())
    }
}
impl From<Address> for ContractValue {
    fn from(value: Address) -> Self {
        Self::Address(value)
    }
}
impl From<&Address> for ContractValue {
    fn from(value: &Address) -> Self {
        Self::Address(value.clone())
    }
}

/// Configuration for a single ticket tier when creating an event.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TierConfig {
    /// Display name (e.g. `"VIP"`).
    pub name: String,
    /// Price per ticket in the event's payment token (i128 to match the
    /// on-chain type).
    pub price: i128,
    /// Total tickets available in this tier.
    pub total_quantity: u128,
}

/// Snapshot of a ticket tier as returned by the contract.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TicketTier {
    /// Tier display name.
    pub name: String,
    /// Price per ticket.
    pub price: i128,
    /// Total tickets minted into the tier.
    pub total_quantity: u128,
    /// Tickets sold so far.
    pub sold_quantity: u128,
}

/// Event metadata snapshot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EventInfo {
    /// On-chain event id.
    pub id: u32,
    /// Event organiser address.
    pub organizer: Address,
    /// Theme / display title.
    pub theme: String,
    /// Free-form event type string (e.g. `"concert"`).
    pub event_type: String,
    /// Total tickets across all tiers.
    pub total_tickets: u128,
    /// Tickets sold across all tiers.
    pub tickets_sold: u128,
    /// Default ticket price.
    pub ticket_price: i128,
    /// Event start (unix seconds).
    pub start_date: u64,
    /// Event end (unix seconds).
    pub end_date: u64,
    /// Whether the event has been cancelled.
    pub is_canceled: bool,
    /// Address of the deployed Ticket NFT contract.
    pub ticket_nft_addr: Address,
    /// Address of the payment token (e.g. USDC, native XLM).
    pub payment_token: Address,
}

/// Ticket NFT metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TicketMetadata {
    /// Ticket display name.
    pub name: String,
    /// Description.
    pub description: String,
    /// Image URI.
    pub image: String,
    /// Linked event id (`0` if not registered yet).
    pub event_id: u32,
    /// Tier name.
    pub tier: String,
}

/// POAP badge metadata.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PoapMetadata {
    /// Source event id.
    pub event_id: u32,
    /// Badge name.
    pub name: String,
    /// Badge description.
    pub description: String,
    /// Badge image URI.
    pub image: String,
    /// Issue timestamp (unix seconds).
    pub issued_at: u64,
}

/// Marketplace listing snapshot.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ListingInfo {
    /// Seller address.
    pub seller: Address,
    /// Ticket NFT contract.
    pub ticket_contract: Address,
    /// Token id being listed.
    pub token_id: i128,
    /// Listing price.
    pub price: i128,
    /// Whether the listing is still active.
    pub active: bool,
    /// Creation timestamp (unix seconds).
    pub created_at: u64,
}

/// Marketplace sale record.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SaleInfo {
    /// Buyer address.
    pub buyer: Address,
    /// Seller address.
    pub seller: Address,
    /// Ticket NFT contract.
    pub ticket_contract: Address,
    /// Token id sold.
    pub token_id: i128,
    /// Final sale price.
    pub price: i128,
    /// Sale timestamp (unix seconds).
    pub timestamp: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn address_round_trips() {
        let a: Address = "CABCDEF".into();
        assert_eq!(a.as_str(), "CABCDEF");
        assert_eq!(a.clone().into_string(), "CABCDEF");
        assert_eq!(format!("{a}"), "CABCDEF");
    }

    #[test]
    fn contract_value_helpers_round_trip() {
        let v = ContractValue::vec([ContractValue::from(1u32), ContractValue::from(2u32)]);
        let items = v.as_vec().expect("vec");
        assert_eq!(items.len(), 2);
        assert_eq!(items[0].as_u32(), Some(1));

        let m = ContractValue::map([("k", ContractValue::from(true))]);
        assert_eq!(m.map_get("k").and_then(ContractValue::as_bool), Some(true));
    }

    #[test]
    fn contract_value_byte_helpers_hex_encode() {
        let bytes = ContractValue::bytes_n32(&[0xab; 32]);
        if let ContractValue::BytesN32(hex_str) = bytes {
            assert_eq!(hex_str.len(), 64);
            assert!(hex_str.starts_with("ab"));
        } else {
            panic!("expected BytesN32");
        }
    }
}
