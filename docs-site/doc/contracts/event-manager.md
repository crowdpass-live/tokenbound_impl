# Event Manager Contract

The **Event Manager Contract** handles the full lifecycle of event ticketing: creation, ticket sales, cancellations, refunds, and updates.

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Contract has already been initialized |
| 2 | `EventNotFound` | No event exists with the given ID |
| 3 | `EventAlreadyCanceled` | Event has already been canceled |
| 4 | `CannotSellMoreTickets` | Ticket sales exceed total supply |
| 5 | `InvalidStartDate` | Start date is in the past |
| 6 | `InvalidEndDate` | End date is before or equal to start date |
| 7 | `NegativeTicketPrice` | Ticket price is negative |
| 8 | `InvalidTicketCount` | Total tickets is zero |
| 9 | `CounterOverflow` | Internal counter overflow |
| 10 | `FactoryNotInitialized` | Ticket factory address not set |

---

## Data Types

### `Event`

```rust
pub struct Event {
    pub id: u32,
    pub theme: String,
    pub organizer: Address,
    pub event_type: String,
    pub total_tickets: u128,
    pub tickets_sold: u128,
    pub ticket_price: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub is_canceled: bool,
    pub ticket_nft_addr: Address,
    pub payment_token: Address,
}
```

---

## Functions

### `initialize`

Initializes the contract with the ticket factory address. Can only be called once.

```rust
fn initialize(env: Env, ticket_factory: Address) -> Result<(), Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `ticket_factory` | `Address` | Address of the deployed Ticket Factory contract |

**Errors:**
- `AlreadyInitialized` (1) — contract was already initialized

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --source <ADMIN_SECRET_KEY> \
  --network testnet \
  -- initialize \
  --ticket_factory <TICKET_FACTORY_ADDRESS>
```

---

### `create_event`

Creates a new event and deploys a dedicated Ticket NFT contract via the factory.

```rust
fn create_event(
    env: Env,
    organizer: Address,
    theme: String,
    event_type: String,
    start_date: u64,
    end_date: u64,
    ticket_price: i128,
    total_tickets: u128,
    payment_token: Address,
) -> u32
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `organizer` | `Address` | Event organizer's address |
| `theme` | `String` | Event name/theme |
| `event_type` | `String` | Category (e.g., "Conference", "Concert") |
| `start_date` | `u64` | Unix timestamp for event start |
| `end_date` | `u64` | Unix timestamp for event end |
| `ticket_price` | `i128` | Price per ticket in payment token units (7 decimals for XLM) |
| `total_tickets` | `u128` | Maximum number of tickets available |
| `payment_token` | `Address` | Address of the payment token contract |

**Returns:** `u32` — the new event ID (0-indexed).

**Authorization:** Requires organizer authorization.

**Errors:**
- `InvalidStartDate` (5) — start date is in the past
- `InvalidEndDate` (6) — end date ≤ start date
- `NegativeTicketPrice` (7) — ticket price < 0
- `InvalidTicketCount` (8) — total tickets = 0
- `FactoryNotInitialized` (10) — `initialize` was not called

**Events emitted:** `event_created(event_id, organizer, ticket_nft_addr)`

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --source <ORGANIZER_SECRET_KEY> \
  --network testnet \
  -- create_event \
  --organizer <ORGANIZER_ADDRESS> \
  --theme "Stellar Summit 2026" \
  --event_type "Conference" \
  --start_date 1743292800 \
  --end_date 1743379200 \
  --ticket_price 1000000000 \
  --total_tickets 500 \
  --payment_token <TOKEN_ADDRESS>
```

---

### `get_event`

Retrieves event details by ID.

```rust
fn get_event(env: Env, event_id: u32) -> Result<Event, Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_id` | `u32` | Event ID to look up |

**Returns:** `Event` struct.

**Errors:**
- `EventNotFound` (2) — no event with this ID

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --network testnet \
  -- get_event \
  --event_id 0
```

---

### `get_event_count`

Returns the total number of events created.

```rust
fn get_event_count(env: Env) -> u32
```

**Returns:** `u32` — total event count.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --network testnet \
  -- get_event_count
```

---

### `get_all_events`

Returns all events. Not paginated — use with caution in production.

```rust
fn get_all_events(env: Env) -> Vec<Event>
```

**Returns:** `Vec<Event>` — all stored events.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --network testnet \
  -- get_all_events
```

---

### `purchase_ticket`

Purchases a ticket for an event. Transfers payment to the organizer and mints an NFT to the buyer.

```rust
fn purchase_ticket(env: Env, buyer: Address, event_id: u32)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `buyer` | `Address` | Ticket purchaser's address |
| `event_id` | `u32` | Event to purchase a ticket for |

**Authorization:** Requires buyer authorization.

**Panics:**
- Event not found
- Event is canceled
- Event is sold out

**Events emitted:** `ticket_purchased(event_id, buyer, ticket_nft_addr)`

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --source <BUYER_SECRET_KEY> \
  --network testnet \
  -- purchase_ticket \
  --buyer <BUYER_ADDRESS> \
  --event_id 0
```

---

### `cancel_event`

Cancels an event, enabling refund claims.

```rust
fn cancel_event(env: Env, event_id: u32) -> Result<(), Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_id` | `u32` | Event ID to cancel |

**Authorization:** Requires organizer authorization.

**Errors:**
- `EventNotFound` (2) — no event with this ID
- `EventAlreadyCanceled` (3) — event was already canceled

**Events emitted:** `event_canceled(event_id)`

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --source <ORGANIZER_SECRET_KEY> \
  --network testnet \
  -- cancel_event \
  --event_id 0
```

---

### `claim_refund`

Claims a refund for a canceled event. Uses a pull model — each buyer claims individually. Prevents double claims.

```rust
fn claim_refund(env: Env, claimer: Address, event_id: u32)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `claimer` | `Address` | Address claiming the refund |
| `event_id` | `u32` | Canceled event ID |

**Authorization:** Requires claimer authorization.

**Panics:**
- Event not found
- Event is not canceled
- Refund already claimed
- Claimer did not purchase a ticket

**Events emitted:** `refund_claimed(event_id, claimer, ticket_price)`

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --source <BUYER_SECRET_KEY> \
  --network testnet \
  -- claim_refund \
  --claimer <BUYER_ADDRESS> \
  --event_id 0
```

---

### `update_event`

Updates event details. Only the organizer can update. Cannot update canceled events.

```rust
fn update_event(
    env: Env,
    event_id: u32,
    theme: Option<String>,
    ticket_price: Option<i128>,
    total_tickets: Option<u128>,
    start_date: Option<u64>,
    end_date: Option<u64>,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_id` | `u32` | Event ID to update |
| `theme` | `Option<String>` | New theme (pass `None` to keep current) |
| `ticket_price` | `Option<i128>` | New price (must be ≥ 0) |
| `total_tickets` | `Option<u128>` | New capacity (must be ≥ tickets already sold) |
| `start_date` | `Option<u64>` | New start timestamp (must be in the future) |
| `end_date` | `Option<u64>` | New end timestamp (must be after start) |

**Authorization:** Requires organizer authorization.

**Panics:**
- Event not found
- Event is canceled
- Ticket price negative
- Total tickets = 0 or below tickets sold
- Start date in the past
- End date before start date

**Events emitted:** `event_updated(event_id, organizer)`

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <EVENT_MANAGER_CONTRACT_ID> \
  --source <ORGANIZER_SECRET_KEY> \
  --network testnet \
  -- update_event \
  --event_id 0 \
  --theme "Updated Theme" \
  --ticket_price 2000000000 \
  --total_tickets 1000 \
  --start_date 1743292800 \
  --end_date 1743465600
```

---

### `update_tickets_sold`

Internal function to update the sold ticket count. Called by the ticket purchase flow.

```rust
fn update_tickets_sold(env: Env, event_id: u32, amount: u128) -> Result<(), Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_id` | `u32` | Event ID |
| `amount` | `u128` | Number of tickets to add to sold count |

**Authorization:** Requires ticket NFT contract authorization.

**Errors:**
- `EventNotFound` (2) — no event with this ID
- `CannotSellMoreTickets` (4) — would exceed total supply
- `CounterOverflow` (9) — arithmetic overflow

---

## Storage Pattern

| Key | Storage Type | Description |
|-----|--------------|-------------|
| `EventCounter` | Instance | Total events created |
| `TicketFactory` | Instance | Ticket Factory contract address |
| `Event(u32)` | Persistent | Event struct by ID |
| `RefundClaimed(u32, Address)` | Persistent | Tracks refund claims per buyer per event |
| `EventBuyers(u32)` | Persistent | List of buyer addresses per event |
