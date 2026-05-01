# Storage and TTL Optimization Audit

This document summarizes storage rent optimization work across the Soroban contracts.

## TTL Pattern Audit

| Contract | Previous pattern | Current pattern |
|---|---|---|
| `upgradeable` | No shared TTL utilities | Added shared constants and helper fns for instance/persistent TTL extension |
| `tba_account` | Inline magic numbers on instance TTL | Uses shared `upgradeable::extend_instance_ttl` |
| `tba_registry` | Inline magic numbers for instance and key TTL | Uses shared TTL helper utilities |
| `ticket_factory` | Inline magic numbers for instance and key TTL | Uses shared TTL helper utilities |
| `marketplace` | Persistent writes without TTL refreshes | TTL refresh added on all persistent state writes |
| `ticket_nft` | Broken mixed metadata key strategy | Consolidated packed token metadata + shared TTL helper usage |
| `event_manager` | Inconsistent/duplicated TTL and missing guards | Unified helper-based TTL + explicit archive flow for finished events |

## Storage Key Optimizations

### `tba_registry`

- Replaced large composite key:
  - `DeployedAccount(BytesN<32>, Address, u128, BytesN<32>)`
- With compact hash key:
  - `DeployedAccount(BytesN<32>)`

The compact key uses a deterministic hash of `(implementation_hash, token_contract, token_id, salt)`.
This lowers rent by reducing serialized key size per account mapping.

### `ticket_nft`

- Replaced multi-key metadata pattern (`MetadataName`, `MetadataDesc`, `MetadataImage`, etc.)
- With packed structs:
  - `Metadata(token_id) -> TicketMetadata`
  - `OffChain(token_id) -> OffChainMetadata`

This reduces writes, key count, and key expansion pressure per token.

## Storage Packing Improvements

### `ticket_nft` packed records

- One key now stores complete on-chain metadata per token.
- Off-chain URI + timestamp are co-located in a single off-chain metadata object.

### `event_manager` archive model

- Added `ArchivedEvent(event_id)` compact summary record.
- Archive operation removes heavyweight ended-event data:
  - event object
  - tier vector
  - buyer vectors and purchase records
  - waitlist data
  - withdrawal/balance flags

This limits long-tail rent growth for historical events.

## Estimated Storage Cost Impact (relative)

| Operation | Before | After | Expected impact |
|---|---|---|---|
| `tba_registry::create_account` mapping write | Large composite key | Compact hash key | Lower per-entry rent |
| `ticket_nft::mint_ticket_nft` metadata writes | Multiple metadata keys | Single packed metadata key | Fewer writes + lower key rent |
| `marketplace::create_listing` | No TTL refresh | TTL refresh on touched keys | Reduced expiry risk, predictable rent behavior |
| `event_manager::archive_event` | No archival cleanup | Removes ended-event heavy keys | Lower long-term rent footprint |

## Archival Strategy for Ended Events

Implemented in `event_manager::archive_event(event_id)`:

- Access: organizer-authenticated
- Preconditions:
  - event has ended
  - event is not cancelled
  - funds already withdrawn
  - event not previously archived
- Effects:
  - persists compact `ArchivedEvent`
  - removes historical heavy keys from persistent storage

Recommended operational flow:

1. Event organizer calls `withdraw_funds` after event end.
2. Organizer calls `archive_event` once settlement is complete.
3. Indexers/UI should read from `get_archived_event` for historical summaries.
