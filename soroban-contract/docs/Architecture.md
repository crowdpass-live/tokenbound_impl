# Architecture Deep Dive

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Components](#core-components)
3. [Contract Interactions](#contract-interactions)
4. [Data Flow](#data-flow)
5. [Storage Patterns](#storage-patterns)
6. [Security Model](#security-model)
7. [Comparison with Other Implementations](#comparison-with-other-implementations)
8. [Design Decisions](#design-decisions)

---

## System Overview

Stellar TBA is a multi-contract system that implements Token Bound Accounts (TBAs) on the Stellar blockchain using Soroban smart contracts. The architecture consists of two layers:

### Layer 1: TBA Infrastructure
The foundational layer that enables any NFT to have its own account:
- **TBA Account Contract**: Individual smart accounts
- **TBA Registry Contract**: Factory and directory for TBA accounts

### Layer 2: Reference Application
A complete event ticketing system that demonstrates TBA capabilities:
- **Event Manager Contract**: Event lifecycle management
- **Ticket Factory Contract**: NFT contract deployment
- **Ticket NFT Contract**: Event ticket representation

```
┌─────────────────────────────────────────────────────────────────┐
│                   Application Layer (Layer 2)                   │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────┐      │
│  │   Event     │───▶│   Ticket     │───▶│   Ticket    │      │
│  │  Manager    │    │   Factory    │    │     NFT     │      │
│  └─────────────┘    └──────────────┘    └──────┬──────┘      │
│                                                  │             │
└──────────────────────────────────────────────────┼─────────────┘
                                                   │
                                                   │ owns
                                                   │
┌──────────────────────────────────────────────────┼─────────────┐
│                Infrastructure Layer (Layer 1)    │             │
│                                                  ▼             │
│  ┌─────────────┐                      ┌─────────────┐         │
│  │     TBA     │◀─────────────────────│     TBA     │         │
│  │  Registry   │      deploys         │   Account   │         │
│  └─────────────┘                      └─────────────┘         │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. TBA Account Contract

**Purpose**: Represents an individual token-bound account owned by a specific NFT.

**Key Characteristics**:
- One instance per NFT (per salt)
- Controlled by current NFT owner
- Can hold any Stellar asset
- Leverages Soroban's `CustomAccountInterface`

**Storage**:
```rust
enum DataKey {
    TokenContract,      // Address of the NFT contract
    TokenId,           // Specific NFT token ID (u128)
    ImplementationHash, // Hash used for deployment
    Salt,              // Deployment salt
    Initialized,       // Init flag
}
```

**Core Functions**:
```rust
// Initialization (called once after deployment)
fn initialize(
    env: Env,
    token_contract: Address,
    token_id: u128,
    implementation_hash: u256,
    salt: u256
)

// Query functions
fn token_contract(env: Env) -> Address
fn token_id(env: Env) -> u128
fn owner(env: Env) -> Address  // Current NFT owner

// Asset management
fn execute(env: Env, to: Address, func: Symbol, args: Vec<Val>)
```

**Why This Design**:
- Minimal storage footprint (only ownership data)
- Extensible (can be upgraded to support more features)
- Leverages Stellar's native auth instead of custom authorization logic

---

### 2. TBA Registry Contract

**Purpose**: Factory and directory for creating and tracking TBA accounts.

**Key Characteristics**:
- Deterministic address calculation
- Single source of truth for TBA creation
- Tracks deployment history per NFT

**Storage**:
```rust
enum DataKey {
    // Total accounts created for an NFT
    AccountCount(Address, u128),  // (nft_contract, token_id)
    
    // Specific account address
    Account {
        nft_contract: Address,
        token_id: u128,
        implementation_hash: u256,
        salt: u256,
    }
}
```

**Core Functions**:
```rust
// Create a new TBA account
fn create_account(
    env: Env,
    implementation_hash: u256,
    token_contract: Address,
    token_id: u128,
    salt: u256
) -> Address

// Calculate address without deploying
fn get_account(
    env: Env,
    implementation_hash: u256,
    token_contract: Address,
    token_id: u128,
    salt: u256
) -> Address

// Query total accounts for an NFT
fn total_deployed_accounts(
    env: Env,
    token_contract: Address,
    token_id: u128
) -> u32
```

**Deterministic Address Calculation**:
```rust
// Pseudo-code for address derivation
address = hash(
    implementation_hash,
    token_contract,
    token_id,
    salt
)
```

This ensures:
- Same inputs = same address
- Address known before deployment
- No collision between different NFTs

---

### 3. Event Manager Contract

**Purpose**: Manages the entire event lifecycle from creation to refunds.

**Data Structures**:
```rust
struct Event {
    id: u32,
    theme: String,
    organizer: Address,
    event_type: String,        // "Concert", "Conference", etc.
    total_tickets: u128,
    tickets_sold: u128,
    ticket_price: i128,        // In stroops
    start_date: u64,           // Unix timestamp
    end_date: u64,
    is_canceled: bool,
    ticket_nft_addr: Address,  // Deployed ticket contract
}
```

**Storage**:
```rust
enum DataKey {
    EventCount,                          // Total events created
    Event(u32),                          // Event data by ID
    UserTicketTokenId(u32, Address),     // User's token ID for event
    UserClaimedRefund(u32, Address),     // Refund claim tracking
}
```

**Core Functions**:
```rust
// Event lifecycle
fn create_event(...) -> u32
fn reschedule_event(event_id: u32, start_date: u64, end_date: u64)
fn cancel_event(event_id: u32)

// Ticketing
fn purchase_ticket(event_id: u32)

// Refunds (THE KEY TBA INTEGRATION)
fn claim_ticket_refund(event_id: u32)
```

**Refund Flow** (The Magic Happens Here):
```rust
fn claim_ticket_refund(event_id: u32) {
    // 1. Verify event is canceled
    // 2. Verify caller owns ticket NFT
    // 3. Get caller's token_id
    // 4. Create/get TBA account for that NFT
    // 5. Transfer refund to TBA (not to caller!)
    // 6. Mark as claimed
}
```

---

### 4. Ticket NFT Contract

**Purpose**: Represents event tickets as NFTs.

**Key Features**:
- ERC721-equivalent functionality
- One ticket per user enforcement
- Role-based access control (minter role = Event Manager)

**Storage**:
```rust
enum DataKey {
    NextTokenId,              // Auto-incrementing
    Owner(u128),              // token_id → owner
    Balance(Address),         // owner → count
    MinterRole,              // Who can mint
}
```

**Core Functions**:
```rust
fn mint_ticket_nft(recipient: Address) -> u128
fn owner_of(token_id: u128) -> Address
fn balance_of(owner: Address) -> u128
fn transfer_from(from: Address, to: Address, token_id: u128)
```

**Constraints**:
```rust
// Enforced in mint_ticket_nft
assert!(balance_of(recipient) == 0, "User already has ticket");
```

This prevents ticket hoarding and ensures fair distribution.

---

### 5. Ticket Factory Contract

**Purpose**: Deploys isolated Ticket NFT contracts for each event.

**Why Separate Contracts Per Event?**
- Isolation: Issues in one event don't affect others
- Cleaner metadata management
- Easier auditing and analytics
- Can customize per-event logic

**Storage**:
```rust
enum DataKey {
    TicketCount,              // Total ticket contracts deployed
    TicketContract(u32),      // event_id → ticket_contract_address
}
```

**Core Function**:
```rust
fn deploy_ticket(
    minter: Address,          // Event Manager contract
    salt: u256
) -> Address
```

**Deployment Process**:
```rust
// 1. Calculate deterministic address
// 2. Deploy with minter = Event Manager
// 3. Store mapping: event_id → ticket_contract
// 4. Return address
```

---

## Contract Interactions

### Scenario 1: Event Creation

```
User                 Event Manager          Ticket Factory         Ticket NFT
  │                        │                      │                     │
  │─create_event()────────▶│                      │                     │
  │                        │                      │                     │
  │                        │─deploy_ticket()─────▶│                     │
  │                        │                      │                     │
  │                        │                      │─deploy()───────────▶│
  │                        │                      │                     │
  │                        │                      │◀────address─────────│
  │                        │                      │                     │
  │                        │◀────address──────────│                     │
  │                        │                      │                     │
  │                        │ (stores event with   │                     │
  │                        │  ticket_nft_addr)    │                     │
  │                        │                      │                     │
  │◀──event_id─────────────│                      │                     │
```

### Scenario 2: Ticket Purchase

```
User        Event Manager    Ticket NFT    TBA Registry    TBA Account
  │               │               │              │               │
  │─purchase()───▶│               │              │               │
  │               │               │              │               │
  │               │ (verify funds,│              │               │
  │               │  event valid) │              │               │
  │               │               │              │               │
  │               │─transfer_from()              │               │
  │               │ (payment)     │              │               │
  │               │               │              │               │
  │               │─mint()───────▶│              │               │
  │               │               │              │               │
  │               │               │◀token_id─────│               │
  │               │               │              │               │
  │               │─create_account()────────────▶│               │
  │               │ (nft_contract,│              │               │
  │               │  token_id,    │              │               │
  │               │  salt)        │              │               │
  │               │               │              │               │
  │               │               │              │─deploy()─────▶│
  │               │               │              │               │
  │               │               │              │◀──address─────│
  │               │               │              │               │
  │               │◀────tba_address──────────────│               │
  │               │               │              │               │
  │◀──success─────│               │              │               │
```

### Scenario 3: Event Cancellation & Refund Claim

```
Organizer    Event Manager    TBA Registry    Ticket NFT    TBA Account    Payment Token
    │              │                │              │             │               │
    │─cancel()────▶│                │              │             │               │
    │              │                │              │             │               │
    │              │ (marks event   │              │             │               │
    │              │  as canceled)  │              │             │               │
    │              │                │              │             │               │
    │◀──success────│                │              │             │               │
    │              │                │              │             │               │
    
User calls claim_refund():
    │              │                │              │             │               │
    │──────────────┼─claim_refund()▶│              │             │               │
    │              │                │              │             │               │
    │              │─verify_owner()─┼─────────────▶│             │               │
    │              │                │              │             │               │
    │              │                │◀─confirmed───│             │               │
    │              │                │              │             │               │
    │              │─get_account()─▶│              │             │               │
    │              │                │              │             │               │
    │              │◀──tba_addr─────│              │             │               │
    │              │                │              │             │               │
    │              │─transfer()─────┼──────────────┼─────────────┼──────────────▶│
    │              │ (to TBA)       │              │             │               │
    │              │                │              │             │               │
    │              │                │              │             │◀──received────│
    │              │                │              │             │               │
    │◀──success────│                │              │             │               │
```

**Key Insight**: The refund goes to the TBA account, NOT the user's wallet. If the user transfers the NFT, the new owner gets the refund.

---

## Data Flow

### Complete Flow: From Event Creation to Refund

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. EVENT CREATION                                                   │
│                                                                     │
│  Organizer → Event Manager → Ticket Factory → Ticket NFT (deployed)│
│                                                                     │
│  Result: Event #1 created with dedicated NFT contract              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. TICKET PURCHASE                                                  │
│                                                                     │
│  User ──(50 USDC)──▶ Event Manager                                 │
│                           │                                         │
│                           ├──▶ Ticket NFT: mint token #1 to User   │
│                           │                                         │
│                           └──▶ TBA Registry: create account for     │
│                                 (ticket_nft_addr, token_id=1)      │
│                                       │                             │
│                                       ▼                             │
│                                 TBA Account #1 created              │
│                                                                     │
│  Result: User owns NFT #1 + controls TBA Account #1                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. EVENT CANCELLATION                                               │
│                                                                     │
│  Organizer → Event Manager: cancel_event(1)                        │
│                                                                     │
│  Result: Event #1 marked as canceled, refunds enabled              │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. REFUND CLAIM                                                     │
│                                                                     │
│  User → Event Manager: claim_ticket_refund(1)                      │
│           │                                                         │
│           ├─ Verify: User owns NFT #1 ✓                            │
│           ├─ Verify: Event #1 is canceled ✓                        │
│           ├─ Get TBA address for NFT #1                            │
│           └─ Transfer 50 USDC → TBA Account #1 (not User wallet!)  │
│                                                                     │
│  Result: 50 USDC in TBA Account #1                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. SECONDARY SALE (The Magic)                                      │
│                                                                     │
│  User → Ticket NFT: transfer(NFT #1, to: Bob)                      │
│                                                                     │
│  NFT #1 ownership: User → Bob                                      │
│  TBA Account #1 control: User → Bob                                │
│  50 USDC in TBA #1: Automatically now Bob's!                       │
│                                                                     │
│  Result: Bob bought "ticket + refund" as atomic unit               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Storage Patterns

### Soroban Storage Types

Soroban provides three storage types with different persistence guarantees:

1. **Instance Storage**: Tied to contract instance, survives upgrades
2. **Persistent Storage**: Long-term data, higher costs
3. **Temporary Storage**: Cheaper, can be archived after inactivity

### Our Usage Strategy

**TBA Account Contract**:
```rust
// Instance storage for ownership data (can't change)
env.storage().instance().set(&DataKey::TokenContract, &addr);
env.storage().instance().set(&DataKey::TokenId, &id);

// Persistent for state that must survive
env.storage().persistent().set(&DataKey::AssetBalance, &amount);
```

**TBA Registry**:
```rust
// Persistent for account mappings (critical to preserve)
env.storage().persistent().set(&account_key, &address);

// Instance for counters
env.storage().instance().set(&DataKey::TotalAccounts, &count);
```

**Event Manager**:
```rust
// Persistent for event data
env.storage().persistent().set(&DataKey::Event(id), &event);

// Temporary for short-lived claims tracking
env.storage().temporary().set(&claim_key, &true);
```

### Why This Matters

- **Cost Optimization**: Temporary storage is 10x cheaper
- **Persistence**: Critical data uses persistent storage
- **Upgradeability**: Instance storage survives contract upgrades

---

## Security Model

### Authorization Layers

#### Layer 1: Contract-Level Authorization
```rust
// Only NFT owner can control TBA
fn execute(env: Env, ...) {
    let owner = get_nft_owner(&env, &token_contract, &token_id);
    owner.require_auth();  // Stellar's native auth
    // ... execute action
}
```

#### Layer 2: Role-Based Access
```rust
// Only event organizer can cancel
fn cancel_event(env: Env, event_id: u32) {
    let event = get_event(&env, event_id);
    event.organizer.require_auth();
    // ... cancel event
}
```

#### Layer 3: State Validation
```rust
// Can only claim refund if event is canceled
fn claim_refund(env: Env, event_id: u32) {
    let event = get_event(&env, event_id);
    assert!(event.is_canceled, "Event not canceled");
    // ... process refund
}
```

### Attack Vectors & Mitigations

**1. Double-Claiming Refunds**
```rust
// Mitigation: Track claims
let claimed = env.storage()
    .persistent()
    .get(&DataKey::ClaimedRefund(event_id, user))
    .unwrap_or(false);
assert!(!claimed, "Already claimed");
```

**2. Unauthorized TBA Access**
```rust
// Mitigation: Always verify NFT ownership
let current_owner = nft.owner_of(token_id);
caller.require_auth();
assert!(caller == current_owner, "Not NFT owner");
```

**3. Reentrancy**
```rust
// Mitigation: Checks-Effects-Interactions pattern
// 1. Check: Verify conditions
// 2. Effect: Update state
// 3. Interact: Call external contracts
```

**4. Integer Overflow**
```rust
// Mitigation: Use checked arithmetic
let new_total = tickets_sold.checked_add(1)
    .expect("Overflow");
```

---

## Comparison with Other Implementations

### vs. Ethereum ERC-6551

| Aspect | Ethereum ERC-6551 | Stellar TBA |
|--------|-------------------|-------------|
| **Account Abstraction** | Bolted on (ERC-4337) | Native (CustomAccountInterface) |
| **Deployment Cost** | $20-100 (high gas) | <$0.01 (predictable) |
| **Address Derivation** | CREATE2 | Similar deterministic hash |
| **Authorization** | Custom signature validation | Stellar native auth |
| **Speed** | 12s - 2min | ~5 seconds |
| **Language** | Solidity | Rust |

### vs. Starknet Cairo Implementation

| Aspect | Starknet (Cairo) | Stellar (Rust/Soroban) |
|--------|------------------|------------------------|
| **Language Maturity** | Cairo (newer) | Rust (mature, widespread) |
| **Account Model** | Native account abstraction | CustomAccountInterface |
| **Storage** | `LegacyMap` | `Map` with type safety |
| **Deployment** | `deploy_syscall` | Deployer pattern |
| **Developer Tooling** | Growing | Excellent (cargo, IDE support) |
| **Ecosystem** | DeFi-focused | Payments-focused |

### Key Innovations in Our Implementation

1. **Leverages Soroban's Native Features**: Not fighting the platform
2. **Type Safety**: Rust's compiler catches bugs at compile-time
3. **Real-World Focus**: Built for payments and ticketing from day one
4. **Minimal Gas**: Optimized for actual usage, not just demos

---

## Design Decisions

### 1. Why Separate Ticket NFT Per Event?

**Decision**: Each event gets its own NFT contract.

**Alternatives Considered**:
- Single NFT contract with token metadata per event
- Event Manager mints from shared NFT pool

**Why We Chose This**:
- **Isolation**: Security breach in one event doesn't affect others
- **Flexibility**: Different events can have different NFT logic
- **Cleaner Metadata**: Each contract = one event's data
- **Gas Efficiency**: No need to filter through all events

**Tradeoff**: Slightly more complex deployment, but worth it.

---

### 2. Why Refund to TBA, Not User Wallet?

**Decision**: Refunds go to TBA account, not directly to user.

**Alternatives Considered**:
- Refund to user wallet (simpler)
- Escrow contract (more complex)

**Why We Chose TBA Refunds**:
- **Atomic Transfers**: Ticket + refund move together
- **Composability**: TBA can hold multiple asset types
- **Future-Proof**: Supports perks, loyalty, vouchers
- **Demonstrates Value**: Shows why TBAs matter

**Tradeoff**: Users need to understand TBAs, but that's the point of this project.

---

### 3. Why One Ticket Per User?

**Decision**: Enforce `balance_of(user) == 0` before minting.

**Alternatives Considered**:
- Allow multiple tickets per user
- Price increase for additional tickets

**Why We Chose One-Per-User**:
- **Fairness**: Prevents whales from buying all tickets
- **Demonstrates Constraint**: Shows NFT can enforce business logic
- **Simplifies UX**: One user = one ticket = one TBA

**Tradeoff**: Users who want multiple tickets need multiple wallets. Could be relaxed in future versions.

---

### 4. Why Deterministic TBA Addresses?

**Decision**: TBA address calculable before deployment.

**Alternatives Considered**:
- Random addresses, stored in mapping
- Counter-based addressing

**Why We Chose Deterministic**:
- **Predictability**: Know address before deploying
- **Gas Savings**: Can skip deployment if not needed
- **Standard Compatibility**: Matches ERC-6551 pattern
- **Cross-Chain**: Same NFT = same TBA address on any chain (in theory)

**Tradeoff**: More complex address calculation, but essential for TBA standard.

---

## Performance Considerations

### Gas Optimization Strategies

1. **Lazy TBA Creation**: Don't deploy TBA until first asset transfer
2. **Batch Operations**: Combine multiple refunds in one transaction
3. **Storage Pruning**: Use temporary storage for ephemeral data
4. **Minimal Storage**: Only store essential data on-chain

### Benchmarks (Estimated)

| Operation | Gas Cost (XLM) | Time |
|-----------|----------------|------|
| Create Event | ~0.001 | 5s |
| Deploy Ticket NFT | ~0.002 | 5s |
| Purchase Ticket | ~0.003 | 5s |
| Create TBA | ~0.001 | 5s |
| Claim Refund | ~0.002 | 5s |
| Transfer NFT | ~0.001 | 5s |

**Total Cost for User**: ~0.006 XLM ($0.0006 at $0.10/XLM)

Compare to Ethereum: ~$50-100 for same operations.

---

## Future Enhancements

### Short Term
- [ ] Support for multiple asset types in TBA
- [ ] Batch refund processing for organizers
- [ ] Event transfer (organizer can transfer event ownership)

### Medium Term
- [ ] TBA delegation (temporary access grants)
- [ ] Cross-event loyalty tracking
- [ ] Marketplace integration

### Long Term
- [ ] SEP proposal for TBA standard
- [ ] Cross-chain TBA compatibility
- [ ] DeFi integrations (TBA as collateral, etc.)

---

## Conclusion

This architecture balances:
- **Simplicity**: Easy to understand and audit
- **Flexibility**: Extensible for future use cases
- **Efficiency**: Optimized for Stellar's strengths
- **Standards**: Compatible with TBA patterns from other chains

By building on Soroban's native features rather than working around limitations, we've created a TBA implementation that's cleaner, cheaper, and more practical than alternatives on other platforms.

The event ticketing application proves the concept while remaining genuinely useful—solving real problems in event management while showcasing TBA capabilities.

---

**Next Steps**: Read [TBA_OVERVIEW.md](TBA_OVERVIEW.md) for conceptual understanding, then dive into the [Contributing Guide](../CONTRIBUTING.md) to start building!