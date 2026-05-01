# Event Schema Standardization

## Overview

All Soroban contracts in the Token Bound Accounts system now use standardized event schemas for indexer compatibility. This document outlines the naming conventions and payload structures used across all contracts.

## Naming Conventions

### Event Names
- **Format**: PascalCase (e.g., `TicketMinted`, `EventCreated`)
- **Structure**: `[Entity][Action]` where Entity is the primary object and Action is the operation performed
- **Consistency**: All contracts use the same naming pattern

### Contract-Specific Prefixes
While not always included in the event name, the `contract_address` field in each event payload allows indexers to identify the originating contract.

## Payload Structure

All events follow a consistent payload structure:

```rust
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventName {
    pub contract_address: Address,  // Contract that emitted the event
    pub primary_id: Type,           // Main identifier (event_id, token_id, etc.)
    // ... additional relevant fields
}
```

### Field Ordering
1. `contract_address`: Always first for indexer filtering
2. Primary identifier(s): Event ID, token ID, listing ID, etc.
3. Relevant addresses: Organizer, buyer, seller, recipient, etc.
4. Amounts/values: Prices, quantities, timestamps, etc.

## Event Reference

### Ticket NFT Contract

#### TicketMinted
```rust
pub struct TicketMintedEvent {
    pub contract_address: Address,
    pub token_id: u128,
    pub recipient: Address,
}
```

#### MetadataUpdated
```rust
pub struct MetadataUpdatedEvent {
    pub contract_address: Address,
    pub token_id: u128,
}
```

#### OffChainUpdated
```rust
pub struct OffChainUpdatedEvent {
    pub contract_address: Address,
    pub token_id: u128,
}
```

### Marketplace Contract

#### ListingCreated
```rust
pub struct ListingCreatedEvent {
    pub contract_address: Address,
    pub listing_id: u32,
    pub seller: Address,
    pub ticket_contract: Address,
    pub token_id: i128,
    pub price: i128,
}
```

#### PurchaseCompleted
```rust
pub struct PurchaseCompletedEvent {
    pub contract_address: Address,
    pub listing_id: u32,
    pub buyer: Address,
    pub seller: Address,
    pub price: i128,
}
```

### Event Manager Contract

#### EventCreated
```rust
pub struct EventCreatedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub organizer: Address,
    pub ticket_nft_addr: Address,
}
```

#### WaitlistCleared
```rust
pub struct WaitlistClearedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub waitlist_count: u32,
}
```

#### RefundClaimed
```rust
pub struct RefundClaimedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub claimer: Address,
    pub quantity: u128,
    pub total_paid: i128,
}
```

#### TicketPurchased
```rust
pub struct TicketPurchasedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub buyer: Address,
    pub quantity: u128,
    pub total_price: i128,
    pub ticket_nft_addr: Address,
    pub tier_index: u32,
}
```

#### EventUpdated
```rust
pub struct EventUpdatedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub organizer: Address,
}
```

#### FundsWithdrawn
```rust
pub struct FundsWithdrawnEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub organizer: Address,
    pub amount: i128,
}
```

### Upgradeable Contract (Shared)

#### UpgradeScheduled
```rust
pub struct UpgradeScheduledEvent {
    pub contract_address: Address,
    pub new_wasm_hash: BytesN<32>,
    pub scheduled_at: u32,
    pub commit_at: u32,
}
```

#### Upgraded
```rust
pub struct UpgradedEvent {
    pub contract_address: Address,
    pub new_wasm_hash: BytesN<32>,
    pub old_version: u32,
    pub new_version: u32,
}
```

#### AdminChanged
```rust
pub struct AdminChangedEvent {
    pub contract_address: Address,
    pub old_admin: Address,
    pub new_admin: Address,
}
```

### TBA Account Contract

#### TransactionExecuted
```rust
pub struct TransactionExecutedEvent {
    pub contract_address: Address,
    pub to: Address,
    pub func: Symbol,
    pub nonce: u64,
}
```

## Indexer Compatibility

### Filtering by Contract
Indexers can filter events by `contract_address` to focus on specific contracts.

### Event Type Identification
- Event names are unique and descriptive
- PascalCase ensures consistency with blockchain standards
- Structured payloads provide all necessary data in predictable formats

### Data Types
- Addresses: `Address` type for all account/contract references
- IDs: `u32` for event/listing IDs, `u128` for token IDs
- Amounts: `i128` for token amounts/prices
- Counts: `u32` for quantities, `u128` for large counts

## Migration Notes

All contracts have been updated to use the new standardized event schemas. Previous event names (snake_case) have been changed to PascalCase, and tuple payloads have been replaced with structured event objects containing `contract_address` as the first field.