# Contract Configuration Parameters

Comprehensive reference for every configurable parameter, constant, storage key, error code, and validation rule in the CrowdPass Soroban smart contracts.

> **Repository:** `crowdpass-live/tokenbound_impl`  
> **Soroban SDK:** `22.0.0`  
> **Resolves:** Issue #192

---

## Table of Contents

1. [Upgradeable Library](#1-upgradeable-library)
2. [EventManager Contract](#2-eventmanager-contract)
3. [TicketFactory Contract](#3-ticketfactory-contract)
4. [TicketNFT Contract](#4-ticketnft-contract)
5. [TbaRegistry Contract](#5-tbaregistry-contract)
6. [TbaAccount Contract](#6-tbaaccount-contract)
7. [Marketplace Contract](#7-marketplace-contract)
8. [Cross-Contract Call Matrix](#8-cross-contract-call-matrix)
9. [Configuration Change Impact Summary](#9-configuration-change-impact-summary)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Upgradeable Library

**Location:** `soroban-contract/contracts/upgradeable/src/lib.rs`

Shared `rlib` compiled into every contract. Provides: upgrade timelock, pause guard, admin management, version counter, and TTL extension helpers.

### 1.1 Upgrade Timelock Constants

| Constant                | Type  | Default  | Notes                                                                                                                                                             |
| ----------------------- | ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UPGRADE_DELAY_LEDGERS` | `u32` | `17_280` | Ledgers between `schedule_upgrade` and `commit_upgrade`. At 5 s/ledger ≈ 24 hours. Increase for more stakeholder reaction time; decrease for faster patch cycles. |
| `LEDGER_SECONDS`        | `u32` | `5`      | Assumed ledger cadence. Used only to derive `LEDGERS_PER_DAY`. Does not affect on-chain behaviour (ledger sequence numbers, not wall-clock time, are used).       |
| `SECONDS_PER_DAY`       | `u32` | `86_400` | Informational. Used to derive `LEDGERS_PER_DAY`.                                                                                                                  |
| `LEDGERS_PER_DAY`       | `u32` | `17_280` | Derived: `86_400 / 5`. Informational only.                                                                                                                        |

### 1.2 Storage TTL Constants

| Constant                        | Type  | Default                | Impact of Changing                                                                                                                                                                                             |
| ------------------------------- | ----- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_TTL_THRESHOLD_LEDGERS` | `u32` | `518_400` (30 days)    | When remaining TTL falls below this threshold an extension is triggered. Raising it means entries refresh more eagerly (higher fees); lowering it risks expiry of rarely-touched state.                        |
| `DEFAULT_TTL_EXTEND_TO_LEDGERS` | `u32` | `1_728_000` (100 days) | Target TTL set during extension. **Must be greater than `DEFAULT_TTL_THRESHOLD_LEDGERS`.** Increasing reduces how often extension transactions run; decreasing saves rent but requires more frequent activity. |

> **Warning:** If `DEFAULT_TTL_EXTEND_TO_LEDGERS` is set below `DEFAULT_TTL_THRESHOLD_LEDGERS`, every write will re-trigger an extension on the same ledger, wasting fees.

### 1.3 UpgradeKey Storage Layout

| Key                          | Storage Type | Value Type          | Purpose                                                                                                           |
| ---------------------------- | ------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `UpgradeKey::Admin`          | Instance     | `Address`           | Contract administrator. Required for all admin-gated operations.                                                  |
| `UpgradeKey::Version`        | Instance     | `u32`               | Monotonically incrementing version. Starts at `1`; bumped by `commit_upgrade()`.                                  |
| `UpgradeKey::Paused`         | Instance     | `bool`              | When `true`, all state-mutating entry points revert via `require_not_paused()`.                                   |
| `UpgradeKey::PendingUpgrade` | Instance     | `(BytesN<32>, u32)` | Tuple of `(new_wasm_hash, scheduled_at_ledger)`. Written by `schedule_upgrade()`; consumed by `commit_upgrade()`. |

### 1.4 Admin & Upgrade Functions

| Function                          | Auth Required | Description                                                                                                                                               |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schedule_upgrade(new_wasm_hash)` | Admin         | Records new WASM hash + current ledger sequence. Emits `upgrade_scheduled`. Cannot be committed until `UPGRADE_DELAY_LEDGERS` have elapsed.               |
| `commit_upgrade()`                | Admin         | Asserts `current_ledger >= scheduled_at + UPGRADE_DELAY_LEDGERS`, removes pending entry, increments version, then calls `update_current_contract_wasm()`. |
| `cancel_upgrade()`                | Admin         | Removes `UpgradeKey::PendingUpgrade` without applying the WASM swap.                                                                                      |
| `pause()`                         | Admin         | Sets `UpgradeKey::Paused = true`. All guarded functions revert.                                                                                           |
| `unpause()`                       | Admin         | Sets `UpgradeKey::Paused = false`.                                                                                                                        |
| `transfer_admin(new_admin)`       | Admin         | Overwrites `UpgradeKey::Admin`. Old admin loses all privileges immediately.                                                                               |

---

## 2. EventManager Contract

**Location:** `soroban-contract/contracts/event_manager/src/lib.rs`

Primary user-facing contract. Organizers create events; buyers purchase tickets; the contract escrows ticket revenue until the event ends, then releases funds to the organizer.

### 2.1 Hard-Coded Constants

> These are baked into the WASM binary. Changing them requires a contract upgrade.

| Constant                     | Type   | Default                  | Range         | Impact of Changing                                                                                                                                                          |
| ---------------------------- | ------ | ------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAX_STRING_BYTES`           | `u32`  | `200`                    | 1 – 200       | Maximum byte length for `theme` and `event_type`. Very long strings increase ledger entry size and fees. Values shorter than 1 byte are rejected with `InvalidStringInput`. |
| `MAX_TICKET_TIERS`           | `u32`  | `32`                     | 1 – 32        | Maximum ticket tiers per event. Each tier is stored as a `TicketTier` struct. Raising this increases per-event storage; lowering prevents flexible pricing models.          |
| `MAX_TICKETS_PER_EVENT`      | `u128` | `500_000`                | 1 – 500_000   | Maximum total tickets across all tiers. Prevents a single event from monopolising network state.                                                                            |
| `MAX_TICKET_PRICE`           | `i128` | `10_000_000_000_000_000` | >= 0          | Maximum `ticket_price` in the token's smallest unit. Prevents overflow in `total_price = price × quantity`.                                                                 |
| `MAX_ORGANIZER_OPEN_EVENTS`  | `u32`  | `50`                     | 1 – u32::MAX  | Maximum concurrent active events per organizer. Prevents resource exhaustion.                                                                                               |
| `EVENT_CREATE_COOLDOWN_SECS` | `u64`  | `120`                    | 0 – any u64   | Minimum seconds between successive event creations by the same organizer. `0` disables rate limiting.                                                                       |
| `MAX_EVENT_DURATION_SECS`    | `u64`  | `31_622_400`             | 1 – any u64   | Maximum allowed span between `start_date` and `end_date` (366 × 86 400 ≈ one leap year).                                                                                    |
| `MAX_EVENT_START_AHEAD_SECS` | `u64`  | `158_112_000`            | 1 – any u64   | Maximum seconds in the future that `start_date` may be set (5 × 366 days).                                                                                                  |
| `MAX_PURCHASE_QUANTITY`      | `u128` | `500`                    | 1 – u128::MAX | Maximum tickets per single `purchase_tickets()` call. Prevents excessive NFT minting gas in one transaction.                                                                |

### 2.2 `CreateEventParams` Fields

| Field           | Type              | Default      | Constraints                                                        | Notes                                                                                                            |
| --------------- | ----------------- | ------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `organizer`     | `Address`         | —            | Any valid Stellar address                                          | Must call `require_auth()`. Only this address can cancel, update, or withdraw funds for the event.               |
| `theme`         | `String`          | —            | 1 – `MAX_STRING_BYTES` bytes                                       | Display name. Empty or too-long values → `InvalidStringInput`.                                                   |
| `event_type`    | `String`          | —            | 1 – `MAX_STRING_BYTES` bytes                                       | Category label (e.g. `"Conference"`). Same length rules as `theme`.                                              |
| `start_date`    | `u64`             | —            | `now < start_date ≤ now + MAX_EVENT_START_AHEAD_SECS`              | Unix timestamp (seconds). Must be strictly in the future and within the lookahead window.                        |
| `end_date`      | `u64`             | —            | `start_date < end_date`; `(end − start) ≤ MAX_EVENT_DURATION_SECS` | Determines when `withdraw_funds()` becomes callable.                                                             |
| `ticket_price`  | `i128`            | —            | `0 ≤ price ≤ MAX_TICKET_PRICE`                                     | Default price when no tiers provided. `0` = free event (no token transfer).                                      |
| `total_tickets` | `u128`            | —            | `1 ≤ n ≤ MAX_TICKETS_PER_EVENT` (when no tiers)                    | Ignored when `tiers` is non-empty; supply is summed from tier configs instead.                                   |
| `payment_token` | `Address`         | —            | Any SEP-41 token contract                                          | Token used for payments and refunds. Must implement `transfer()`. Mismatches cause fund loss — choose carefully. |
| `tiers`         | `Vec<TierConfig>` | `[]` (empty) | 0 – `MAX_TICKET_TIERS` elements                                    | When empty, a single `"General"` tier is auto-created. When non-empty, each tier is validated independently.     |

### 2.3 `TierConfig` Fields

| Field            | Type     | Constraints                     | Notes                                                                                                     |
| ---------------- | -------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `name`           | `String` | 1 – `MAX_STRING_BYTES` bytes    | Human-readable tier label (e.g. `"VIP"`, `"Early Bird"`).                                                 |
| `price`          | `i128`   | `0 ≤ price ≤ MAX_TICKET_PRICE`  | Per-ticket price for this tier. Each tier can have a distinct price. `0` = free tier.                     |
| `total_quantity` | `u128`   | `1 ≤ n ≤ MAX_TICKETS_PER_EVENT` | Supply for this tier. The aggregate across all tiers must also satisfy `1 ≤ sum ≤ MAX_TICKETS_PER_EVENT`. |

### 2.4 Bulk-Purchase Discount Schedule

Encoded in `calculate_total_price()`. Requires a contract upgrade to change.

| Min Quantity | Discount       | Formula                            |
| ------------ | -------------- | ---------------------------------- |
| 1 – 4        | None           | `price × quantity`                 |
| 5 – 9        | 5% (500 bps)   | `price × quantity × 9500 / 10_000` |
| 10+          | 10% (1000 bps) | `price × quantity × 9000 / 10_000` |

### 2.5 `DataKey` Storage Layout

| Key                                | Storage    | Value Type        | Purpose                                                                               |
| ---------------------------------- | ---------- | ----------------- | ------------------------------------------------------------------------------------- |
| `Event(u32)`                       | Persistent | `Event`           | Full event record keyed by `event_id`.                                                |
| `ArchivedEvent(u32)`               | Persistent | `ArchivedEvent`   | Compact summary written by `archive_event()`. Original `Event` entry is removed.      |
| `EventCounter`                     | Instance   | `u32`             | Monotonically incrementing event ID. Starts at `0`.                                   |
| `TicketFactory`                    | Instance   | `Address`         | Address of the `TicketFactory` contract. Set once in `initialize()`.                  |
| `RefundClaimed(u32, Address)`      | Persistent | `bool`            | Prevents double refunds. Set to `true` after a successful `claim_refund()`.           |
| `EventBuyers(u32)`                 | Persistent | `Vec<Address>`    | Ordered list of unique buyer addresses. Appended on each buyer's first purchase.      |
| `EventTiers(u32)`                  | Persistent | `Vec<TicketTier>` | Live tier state including `sold_quantity`. Updated on every purchase.                 |
| `BuyerPurchase(u32, Address)`      | Persistent | `BuyerPurchase`   | Cumulative `quantity` and `total_paid` per `(event, buyer)`. Used for refund amounts. |
| `Waitlist(u32)`                    | Persistent | `Vec<Address>`    | Optional waitlist. Cleared on `cancel_event()`.                                       |
| `EventBalance(u32)`                | Persistent | `i128`            | Running total of payment tokens held by the contract for this event.                  |
| `FundsWithdrawn(u32)`              | Persistent | `bool`            | Prevents double withdrawal. Set in `withdraw_funds()`.                                |
| `OrganizerOpenEventCount(Address)` | Persistent | `u32`             | Count of active events per organizer for rate-limiting.                               |
| `OrganizerLastCreateTs(Address)`   | Instance   | `u64`             | Ledger timestamp of organizer's most recent event creation.                           |

### 2.6 Error Codes

| Code | Name                       | When Triggered                                                                                  |
| ---- | -------------------------- | ----------------------------------------------------------------------------------------------- |
| 1    | `AlreadyInitialized`       | `initialize()` called on a contract that already has `TicketFactory` set.                       |
| 2    | `EventNotFound`            | Requested `event_id` does not exist in persistent storage.                                      |
| 3    | `EventAlreadyCanceled`     | Operation attempted on an event whose `is_canceled` flag is `true`.                             |
| 4    | `CannotSellMoreTickets`    | `update_tickets_sold()` would cause `tickets_sold` to exceed `total_tickets`.                   |
| 5    | `InvalidStartDate`         | `start_date` is in the past or exceeds the `MAX_EVENT_START_AHEAD_SECS` window.                 |
| 6    | `InvalidEndDate`           | `end_date ≤ start_date`, or the span exceeds `MAX_EVENT_DURATION_SECS`.                         |
| 7    | `NegativeTicketPrice`      | `ticket_price` or a tier price is less than zero.                                               |
| 8    | `InvalidTicketCount`       | `total_tickets` is `0`, or aggregate tier supply is `0` or exceeds `MAX_TICKETS_PER_EVENT`.     |
| 9    | `CounterOverflow`          | `EventCounter` or `tickets_sold` would overflow on increment.                                   |
| 10   | `FactoryNotInitialized`    | `TicketFactory` address not found; `initialize()` was not called.                               |
| 11   | `InvalidTierIndex`         | `tier_index` in `purchase_ticket(s)` is ≥ the number of stored tiers.                           |
| 12   | `TierSoldOut`              | Requested quantity would exceed the tier's `total_quantity`.                                    |
| 13   | `InvalidTierConfig`        | A tier has `price < 0`, `total_quantity = 0`, or `total_quantity > MAX_TICKETS_PER_EVENT`.      |
| 14   | `EventNotCanceled`         | `claim_refund()` called on an active (non-canceled) event.                                      |
| 15   | `RefundAlreadyClaimed`     | A refund for this `(event_id, claimer)` has already been processed.                             |
| 16   | `NotABuyer`                | `claimer` has no `BuyerPurchase` record for this event.                                         |
| 17   | `EventSoldOut`             | Reserved; aggregate tier supply is exhausted.                                                   |
| 18   | `TicketsBelowSold`         | `update_event()` would set `total_tickets` below current `tickets_sold`.                        |
| 19   | `EventNotEnded`            | `withdraw_funds()` called before ledger timestamp has passed `end_date`.                        |
| 20   | `FundsAlreadyWithdrawn`    | `withdraw_funds()` called a second time; double-withdrawal guard triggered.                     |
| 21   | `InvalidStringInput`       | `theme` or `event_type` is empty or exceeds `MAX_STRING_BYTES`.                                 |
| 22   | `TicketPriceOutOfRange`    | `ticket_price` or a tier price exceeds `MAX_TICKET_PRICE`.                                      |
| 23   | `TooManyOrganizerEvents`   | Organizer already has `MAX_ORGANIZER_OPEN_EVENTS` concurrent active events.                     |
| 24   | `EventCreationRateLimited` | Organizer created an event less than `EVENT_CREATE_COOLDOWN_SECS` seconds ago.                  |
| 25   | `EventScheduleOutOfRange`  | `start_date` or `end_date` violates the span or lookahead window constraints.                   |
| 26   | `TooManyTicketTiers`       | `tiers.len()` exceeds `MAX_TICKET_TIERS` (32).                                                  |
| 27   | `PurchaseQuantityTooLarge` | `quantity` in `purchase_tickets()` exceeds `MAX_PURCHASE_QUANTITY` (500).                       |
| 28   | `AlreadyArchived`          | `archive_event()` called on an event that has already been archived.                            |
| 29   | `ArchiveNotAllowed`        | `archive_event()` called on a canceled event, before `end_date`, or before funds are withdrawn. |

---

## 3. TicketFactory Contract

**Location:** `soroban-contract/contracts/ticket_factory/src/lib.rs`

Deploys a fresh `TicketNFT` WASM instance for each event. Called internally by `EventManager` during event creation.

### 3.1 Constructor Parameters

| Parameter          | Type         | Constraints                   | Notes                                                                                                                                                           |
| ------------------ | ------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`            | `Address`    | Any valid Stellar address     | Controls `deploy_ticket()` and all upgrade/pause operations. Normally set to the `EventManager` address so it can autonomously deploy NFT contracts.            |
| `ticket_wasm_hash` | `BytesN<32>` | 32-byte hash of uploaded WASM | WASM hash of the `TicketNFT` contract. Must be uploaded to the network before factory deployment. Changing it (via upgrade) affects all future NFT deployments. |

### 3.2 `DataKey` Storage Layout

| Key                   | Storage    | Value Type   | Purpose                                                                                                 |
| --------------------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| `Admin`               | Instance   | `Address`    | Factory administrator for `require_auth()` checks in `deploy_ticket()`.                                 |
| `TicketWasmHash`      | Instance   | `BytesN<32>` | WASM hash for all NFT contract deployments. Updatable only through the upgrade mechanism.               |
| `TotalTickets`        | Instance   | `u32`        | Running count of deployed ticket contracts. Starts at `0`; incremented to 1-indexed on each deployment. |
| `TicketContract(u32)` | Persistent | `Address`    | Maps `ticket_id` (1-indexed) to the deployed NFT contract address.                                      |

### 3.3 Error Codes

| Code | Name             | When Triggered                                               |
| ---- | ---------------- | ------------------------------------------------------------ |
| 1    | `NotInitialized` | `Admin` or `TicketWasmHash` not found in instance storage.   |
| 2    | `Unauthorized`   | Reserved — auth failures surface via `require_auth()` panic. |

---

## 4. TicketNFT Contract

**Location:** `soroban-contract/contracts/ticket_nft/src/lib.rs`

Non-fungible token contract where each address may hold at most one token. Tokens are sequentially ID'd starting at `1`.

### 4.1 Constructor Parameters

| Parameter | Type      | Notes                                                                                                                                                                                 |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minter`  | `Address` | Sole address authorised to call `mint_ticket_nft()`. In production this is the `EventManager` contract address. Also controls metadata updates on tickets without a registered event. |

### 4.2 Mint Behaviour & Defaults

| Parameter            | Type     | Default              | Notes                                                                                                                                  |
| -------------------- | -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `NextTokenId` (auto) | `u128`   | `1`                  | Sequential token IDs stored in instance storage. Never reused after a burn.                                                            |
| `metadata.name`      | `String` | `"Ticket"`           | Applied at mint. Can be updated post-mint via `update_metadata()`.                                                                     |
| `metadata.tier`      | `String` | `"General"`          | Default tier label. Update via `update_metadata()`.                                                                                    |
| `metadata.event_id`  | `u32`    | `0`                  | When `0`, metadata admin rights belong to the minter. When `> 0`, the registered organizer in `EventInfo(event_id)` controls metadata. |
| `token_uri` default  | `String` | `"onchain://ticket"` | Returned by `token_uri()` when no `OffChainMetadata` is set. Override per-token via `update_off_chain_uri()`.                          |

### 4.3 Transfer Rules

- Each address may hold **at most 1 token**. `RecipientAlreadyHasTicket` is returned if the recipient's balance > 0.
- The `from` address must be the current owner; `Unauthorized` is returned otherwise.
- `TicketMetadata` is retained through transfers — it is bound to the `token_id`, not the owner address.

### 4.4 `DataKey` Storage Layout

| Key                | Storage    | Value Type         | Purpose                                                                                             |
| ------------------ | ---------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| `Minter`           | Instance   | `Address`          | Address authorised to mint. Set in constructor.                                                     |
| `NextTokenId`      | Instance   | `u128`             | Next token ID to assign. Starts at `1`.                                                             |
| `Owner(u128)`      | Persistent | `Address`          | Current owner of `token_id`. Removed on burn (`is_valid()` returns `false` when missing).           |
| `Balance(Address)` | Persistent | `u128`             | `0` or `1`. Enforces the one-ticket-per-address invariant.                                          |
| `Metadata(u128)`   | Persistent | `TicketMetadata`   | On-chain metadata: `name`, `description`, `image`, `event_id`, `tier`.                              |
| `OffChain(u128)`   | Persistent | `OffChainMetadata` | Optional off-chain URI override: `uri`, `updated_at`. When present, `token_uri()` returns this URI. |
| `EventInfo(u32)`   | Persistent | `EventInfo`        | Registered event metadata: `event_name`, `organizer`. Determines who can update token metadata.     |

### 4.5 Error Codes

| Code | Name                        | When Triggered                                                                                                 |
| ---- | --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | `UserAlreadyHasTicket`      | `mint_ticket_nft()` called for a recipient whose `balance > 0`.                                                |
| 2    | `InvalidTokenId`            | `token_id` does not have an `Owner` entry (token does not exist or was burned).                                |
| 3    | `Unauthorized`              | `transfer_from()` caller is not the owner of the token.                                                        |
| 4    | `RecipientAlreadyHasTicket` | `transfer_from()` target address already holds a ticket.                                                       |
| 5    | `NotInitialized`            | `Minter` not found in instance storage.                                                                        |
| 6    | `MetadataNotFound`          | `Metadata(token_id)` entry is absent despite the token existing.                                               |
| 7    | `OnlyOrganizerCanUpdate`    | `update_metadata()` called for a token with a registered `event_id` but the caller is not the event organizer. |

---

## 5. TbaRegistry Contract

**Location:** `soroban-contract/contracts/tba_registry/src/lib.rs`

Factory and directory for Token-Bound Accounts. Each TBA address is deterministically derived from `(implementation_hash, token_contract, token_id, salt)`.

### 5.1 Constructor Parameters

| Parameter               | Type         | Notes                                                                                                                                                 |
| ----------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`                 | `Address`    | Upgrade admin for the registry itself. Does not control individual TBA accounts.                                                                      |
| `tba_account_wasm_hash` | `BytesN<32>` | WASM hash deployed for every `create_account()` call. Changing this (via upgrade) affects only future TBA deployments — existing TBAs are unaffected. |

### 5.2 `create_account()` Parameters

| Parameter             | Type         | Notes                                                                                                                                  |
| --------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `implementation_hash` | `BytesN<32>` | Conceptually the TBA "version". Together with `salt` allows multiple TBAs per NFT.                                                     |
| `token_contract`      | `Address`    | The NFT contract this TBA is bound to. Must implement `owner_of(u128) -> Address`.                                                     |
| `token_id`            | `u128`       | The specific NFT token that controls this TBA. The caller must be the current NFT owner.                                               |
| `salt`                | `BytesN<32>` | User-supplied entropy for deterministic address derivation. Reusing the same salt for identical parameters → `AccountAlreadyDeployed`. |

### 5.3 Address Derivation

The composite salt is computed as:

```
SHA-256(
  impl_hash[32]
  || SHA-256(token_contract_xdr)
  || token_id_be[16]
  || salt[32]
)
```

This value is passed to `env.deployer().with_current_contract(composite_salt).deploy_v2(wasm_hash, [])`. The resulting address is fully deterministic and can be predicted via `get_account()` before deployment.

### 5.4 `DataKey` Storage Layout

| Key                           | Storage    | Value Type   | Purpose                                                                                      |
| ----------------------------- | ---------- | ------------ | -------------------------------------------------------------------------------------------- |
| `ImplementationWasmHash`      | Instance   | `BytesN<32>` | WASM hash for `TbaAccount` deployment. Set in constructor.                                   |
| `DeployedAccount(BytesN<32>)` | Persistent | `Address`    | Maps `composite_salt → deployed TBA address`. Presence used as the "already deployed" guard. |
| `AccountCount(Address, u128)` | Persistent | `u32`        | Number of TBAs deployed for a given `(token_contract, token_id)` pair.                       |

### 5.5 Error Codes

| Code | Name                     | When Triggered                                                           |
| ---- | ------------------------ | ------------------------------------------------------------------------ |
| 1    | `AccountAlreadyDeployed` | A TBA with the same composite salt already exists in persistent storage. |
| 2    | `NotInitialized`         | `ImplementationWasmHash` not found in instance storage.                  |

---

## 6. TbaAccount Contract

**Location:** `soroban-contract/contracts/tba_account/src/lib.rs`

Smart-wallet bound to a specific NFT. Whoever holds the NFT controls the TBA. Ownership is checked live via cross-contract call on every operation.

### 6.1 `initialize()` Parameters

Called once by the `TbaRegistry` immediately after deployment.

| Parameter             | Type         | Notes                                                                                                                                           |
| --------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `token_contract`      | `Address`    | NFT contract whose `owner_of()` is called on every `execute()` and `__check_auth()`.                                                            |
| `token_id`            | `u128`       | Specific NFT token ID. Stored as `u128` — no `u64` truncation (verified by fuzz test `test_large_token_id_success`, supports IDs > `u64::MAX`). |
| `implementation_hash` | `BytesN<32>` | Stored for auditing purposes only. Not used in runtime logic.                                                                                   |
| `salt`                | `BytesN<32>` | Stored for auditing purposes only. Corresponds to the registry's deployment salt.                                                               |

### 6.2 Nonce

A `u64` counter stored through the shared nonce manager helper. Starts at `0`; incremented by `1` on every successful `execute()` call. Publicly readable via `nonce()`. Emitted in the `TransactionExecuted` event for replay-protection and sequencing.

### 6.3 Ownership Transfer Behaviour

There is **no explicit ownership transfer function**. Ownership automatically follows the NFT: when the underlying `TicketNFT` token is transferred via `transfer_from()`, the new address becomes the TBA owner and gains `execute()` rights on the next call. The old owner's authority is revoked immediately.

### 6.4 `DataKey` Storage Layout

| Key                           | Storage  | Value Type   | Purpose                                                                   |
| ----------------------------- | -------- | ------------ | ------------------------------------------------------------------------- |
| `DataKey::TokenContract`      | Instance | `Address`    | NFT contract address. Queried on every `execute()` and `__check_auth()`.  |
| `DataKey::TokenId`            | Instance | `u128`       | NFT token ID used in `owner_of()` cross-contract calls.                   |
| `DataKey::ImplementationHash` | Instance | `BytesN<32>` | WASM hash recorded at init for traceability.                              |
| `DataKey::Salt`               | Instance | `BytesN<32>` | Deployment salt recorded at init for traceability.                        |
| `DataKey::Initialized`        | Instance | `bool`       | Re-initialization guard. `AlreadyInitialized` returned if already `true`. |
| Shared nonce manager key      | Instance | `u64`        | Transaction counter. Starts at `0`; incremented on each `execute()`.      |

### 6.5 Error Codes

| Code | Name                 | When Triggered                                                       |
| ---- | -------------------- | -------------------------------------------------------------------- |
| 1    | `AlreadyInitialized` | `initialize()` called when the `Initialized` flag is already `true`. |
| 2    | `NotInitialized`     | `execute()` or `owner()` called before `initialize()` was run.       |

---

## 7. Marketplace Contract

**Location:** `soroban-contract/contracts/marketplace/src/lib.rs`

Secondary-market contract for peer-to-peer ticket resale. Sellers list tickets; buyers pay and receive the NFT atomically.

### 7.1 Constructor Parameters

| Parameter              | Type      | Default | Notes                                                                                                                                                |
| ---------------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin`                | `Address` | —       | Marketplace administrator. Controls `update_price_cap()` and all upgrade/pause operations.                                                           |
| `max_price_multiplier` | `i128`    | —       | Upper bound multiplier on listing prices. Stored in `PriceCap`; enforcement logic is a planned enhancement (currently only `price > 0` is enforced). |
| `min_price_multiplier` | `i128`    | —       | Lower bound multiplier. Same implementation note as `max_price_multiplier`.                                                                          |
| `MaxListingsPerUser`   | `u32`     | `10`    | Per-user listing cap stored at construction. Not yet enforced per-user in `create_listing()` — planned for a future version.                         |

### 7.2 `PriceCap` Configuration

| Field                  | Type   | Default            | Notes                                                                                             |
| ---------------------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| `max_price_multiplier` | `i128` | Set in constructor | Upper cap. Active only when `active = true`. Full multiplier enforcement is a future enhancement. |
| `min_price_multiplier` | `i128` | Set in constructor | Lower cap. Same note.                                                                             |
| `active`               | `bool` | `true`             | When `false`, all price cap enforcement is skipped. Toggle via `update_price_cap()`.              |

> **Production Note:** The current implementation uses the `Admin` address as the payment token in `purchase_ticket()`. A dedicated SEP-41 token contract should be configured for XLM or USDC payments before mainnet deployment. This requires a contract upgrade.

### 7.3 `DataKey` Storage Layout

| Key                  | Storage    | Value Type | Purpose                                                                                            |
| -------------------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `Listing(u32)`       | Persistent | `Listing`  | Full listing record. `listing_id` is a 0-indexed sequential counter.                               |
| `Sale(u32)`          | Persistent | `Sale`     | Historical completed sale record. `sale_id` is a 0-indexed sequential counter.                     |
| `TotalListings`      | Persistent | `u32`      | Total listings ever created (not just active). Used as the next `listing_id`.                      |
| `TotalSales`         | Persistent | `u32`      | Total completed sales. Used as the next `sale_id`.                                                 |
| `PriceCap`           | Persistent | `PriceCap` | Current price cap policy. Updatable by admin via `update_price_cap()`.                             |
| `Admin`              | Persistent | `Address`  | Marketplace admin address. Also used as the payment token placeholder (see production note above). |
| `MaxListingsPerUser` | Persistent | `u32`      | Stored per-user listing limit (currently unenforced in `create_listing()`).                        |

### 7.4 Error Codes

| Code | Name                        | When Triggered                                                                     |
| ---- | --------------------------- | ---------------------------------------------------------------------------------- |
| 1    | `ListingNotFound`           | `purchase_ticket()` or `cancel_listing()` called with a non-existent `listing_id`. |
| 2    | `ListingNotActive`          | `purchase_ticket()` called on a listing whose `active` flag is `false`.            |
| 3    | `CannotPurchaseOwnListing`  | `buyer == listing.seller` in `purchase_ticket()`.                                  |
| 4    | `PaymentTokenNotConfigured` | `Admin` address not found in persistent storage.                                   |
| 5    | `OnlySellerCanCancel`       | `cancel_listing()` caller is not the original listing seller.                      |
| 6    | `ListingAlreadyInactive`    | `cancel_listing()` called on a listing already set to `active = false`.            |
| 7    | `PriceMustBePositive`       | Reserved; currently checked via panic in `create_listing()`.                       |
| 8    | `InsufficientBalance`       | Reserved; insufficient balance surfaces as a failed `token.transfer()`.            |
| 9    | `Unauthorized`              | `update_price_cap()` caller does not match the stored admin address.               |

---

## 8. Cross-Contract Call Matrix

| Caller         | Callee          | Function            | When                                                                                                       |
| -------------- | --------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `EventManager` | `TicketFactory` | `deploy_ticket()`   | During `create_event_with_tiers()` — deploys a new NFT contract per event.                                 |
| `EventManager` | `TicketNFT`     | `mint_ticket_nft()` | During `purchase_ticket(s)()` — one call per ticket in the quantity.                                       |
| `EventManager` | SEP-41 Token    | `transfer()`        | During purchase (buyer → contract) and `claim_refund` / `withdraw_funds` (contract → recipient/organizer). |
| `TbaRegistry`  | `TicketNFT`     | `owner_of()`        | Before deploying a TBA to verify the caller is the NFT owner.                                              |
| `TbaRegistry`  | `TbaAccount`    | `initialize()`      | Immediately after deploying each TBA contract.                                                             |
| `TbaAccount`   | `TicketNFT`     | `owner_of()`        | On every `execute()` and `__check_auth()` call — live ownership check.                                     |
| `TbaAccount`   | Any contract    | Any function        | Via `execute()` — the TBA relays arbitrary calls on behalf of the NFT owner.                               |
| `Marketplace`  | `TicketNFT`     | `balance()`         | In `create_listing()` to verify the seller holds tickets.                                                  |
| `Marketplace`  | SEP-41 Token    | `transfer()`        | In `purchase_ticket()` to move payment from buyer to seller.                                               |
| `Marketplace`  | `TicketNFT`     | `transfer_from()`   | In `purchase_ticket()` to move the NFT from seller to buyer.                                               |

---

## 9. Configuration Change Impact Summary

| Parameter                       | Change     | Primary Impact                                                               |
| ------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `UPGRADE_DELAY_LEDGERS`         | Increase   | Longer community review window before upgrades; slower emergency patches.    |
| `UPGRADE_DELAY_LEDGERS`         | Decrease   | Faster deployments; reduced stakeholder reaction time.                       |
| `DEFAULT_TTL_EXTEND_TO_LEDGERS` | Increase   | State lives longer; fewer extension transactions; higher upfront rent.       |
| `DEFAULT_TTL_EXTEND_TO_LEDGERS` | Decrease   | State may expire on low-activity contracts; cheaper rent per ledger.         |
| `MAX_STRING_BYTES`              | Increase   | Longer event names allowed; higher storage cost per event.                   |
| `MAX_TICKET_TIERS`              | Increase   | More pricing tiers per event; higher per-event storage.                      |
| `MAX_TICKETS_PER_EVENT`         | Increase   | Larger events possible; more NFT mints per event.                            |
| `MAX_TICKET_PRICE`              | Increase   | Higher priced tickets allowed; no functional change at typical price levels. |
| `MAX_ORGANIZER_OPEN_EVENTS`     | Increase   | Prolific organizers supported; higher storage pressure per organizer.        |
| `EVENT_CREATE_COOLDOWN_SECS`    | Increase   | Spam prevention improved; legitimate organizers must wait longer.            |
| `MAX_PURCHASE_QUANTITY`         | Increase   | Bulk buyers can acquire more tickets per tx; higher NFT mint gas per call.   |
| `PriceCap.active = false`       | Disable    | No price floor/ceiling enforcement on marketplace listings.                  |
| `TbaAccount.token_id`           | N/A — live | Ownership automatically follows NFT transfer; no admin action required.      |

---

## 10. Deployment Checklist

Before deploying to mainnet verify each item:

- [ ] Upload `TicketNFT` WASM and record its 32-byte hash.
- [ ] Upload `TbaAccount` WASM and record its 32-byte hash.
- [ ] Deploy `TicketFactory` with `(admin, ticket_nft_wasm_hash)`. Verify `get_admin()` returns the expected address.
- [ ] Deploy `TbaRegistry` with `(admin, tba_account_wasm_hash)`. Verify `ImplementationWasmHash` is set.
- [ ] Deploy `EventManager` and call `initialize(admin, ticket_factory_address)`.
- [ ] Set `NEXT_PUBLIC_EVENT_MANAGER_CONTRACT` in `soroban-client/.env.local`.
- [ ] Set `NEXT_PUBLIC_HORIZON_URL`, `NEXT_PUBLIC_SOROBAN_RPC_URL`, `NEXT_PUBLIC_NETWORK_PASSPHRASE`.
- [ ] Confirm `DEFAULT_TTL_THRESHOLD_LEDGERS` < `DEFAULT_TTL_EXTEND_TO_LEDGERS`. Current values: `518_400 < 1_728_000` ✓
- [ ] Confirm `payment_token` for each event is a deployed SEP-41 token contract (not a placeholder).
- [ ] Replace the Admin-as-payment-token pattern in `Marketplace` before production use.
- [ ] Run `cargo test --release` in `soroban-contract/` — all unit and integration tests must pass.
- [ ] Review fuzz test results for `EventManager` and `TicketNFT` (proptest, 50 cases each).
