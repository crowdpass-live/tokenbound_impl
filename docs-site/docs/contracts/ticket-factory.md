# Ticket Factory Contract

The **Ticket Factory Contract** deploys isolated Ticket NFT contract instances for each event. Admin-controlled with deterministic address generation.

## Error Conditions

This contract uses panics (not typed errors) for failure cases:
- Calling `deploy_ticket` without admin authorization
- Accessing storage before initialization

---

## Functions

### `__constructor`

Initializes the factory with an admin and the Ticket NFT WASM hash. Called automatically on deployment.

```rust
fn __constructor(env: Env, admin: Address, ticket_wasm_hash: BytesN<32>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `admin` | `Address` | Address authorized to deploy new ticket contracts |
| `ticket_wasm_hash` | `BytesN<32>` | WASM hash of the Ticket NFT contract |

**Soroban CLI Example:**

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/ticket_factory.wasm \
  --source <ADMIN_SECRET_KEY> \
  --network testnet \
  -- --admin <ADMIN_ADDRESS> --ticket_wasm_hash <TICKET_NFT_WASM_HASH>
```

---

### `deploy_ticket`

Deploys a new Ticket NFT contract instance with a designated minter.

```rust
fn deploy_ticket(env: Env, minter: Address, salt: BytesN<32>) -> Address
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `minter` | `Address` | Address with minting rights on the new contract (typically the Event Manager) |
| `salt` | `BytesN<32>` | Unique salt for deterministic address generation |

**Returns:** `Address` — the deployed Ticket NFT contract address.

**Authorization:** Requires admin authorization.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_FACTORY_CONTRACT_ID> \
  --source <ADMIN_SECRET_KEY> \
  --network testnet \
  -- deploy_ticket \
  --minter <EVENT_MANAGER_ADDRESS> \
  --salt <SALT_HEX>
```

---

### `get_ticket_contract`

Returns the ticket contract address for a given event ID.

```rust
fn get_ticket_contract(env: Env, event_id: u32) -> Option<Address>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event_id` | `u32` | Event identifier (1-indexed) |

**Returns:** `Option<Address>` — `Some(address)` if found, `None` otherwise.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_FACTORY_CONTRACT_ID> \
  --network testnet \
  -- get_ticket_contract \
  --event_id 1
```

---

### `get_total_tickets`

Returns the total number of ticket contracts deployed.

```rust
fn get_total_tickets(env: Env) -> u32
```

**Returns:** `u32` — total deployed contract count.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_FACTORY_CONTRACT_ID> \
  --network testnet \
  -- get_total_tickets
```

---

### `get_admin`

Returns the factory admin address.

```rust
fn get_admin(env: Env) -> Address
```

**Returns:** `Address` — the admin address.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_FACTORY_CONTRACT_ID> \
  --network testnet \
  -- get_admin
```

---

## Storage Pattern

| Key | Storage Type | Description |
|-----|--------------|-------------|
| `Admin` | Instance | Factory administrator address |
| `TicketWasmHash` | Instance | WASM hash of the Ticket NFT contract |
| `TotalTickets` | Instance | Count of deployed ticket contracts |
| `TicketContract(u32)` | Persistent | Event ID → deployed ticket contract address |
