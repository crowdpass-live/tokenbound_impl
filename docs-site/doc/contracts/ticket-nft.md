# Ticket NFT Contract

The **Ticket NFT Contract** represents event tickets as NFTs on Soroban. Each user can hold at most one ticket per event contract instance.

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `UserAlreadyHasTicket` | Recipient already owns a ticket in this contract |
| 2 | `InvalidTokenId` | Token ID does not exist or has been burned |
| 3 | `Unauthorized` | Caller is not authorized for this operation |
| 4 | `RecipientAlreadyHasTicket` | Transfer recipient already holds a ticket |

---

## Functions

### `__constructor`

Initializes the NFT contract with a minter address. Called automatically on deployment.

```rust
fn __constructor(env: Env, minter: Address)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `minter` | `Address` | Address with exclusive minting privileges |

**Soroban CLI Example:**

```bash
# Deployed via ticket_factory; constructor is called automatically during deploy.
# The minter is set to the deploying entity (typically the Event Manager).
```

---

### `mint_ticket_nft`

Mints a new ticket NFT to the specified recipient. Enforces one-ticket-per-user.

```rust
fn mint_ticket_nft(env: Env, recipient: Address) -> Result<u128, Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `recipient` | `Address` | Address to receive the ticket |

**Returns:** `u128` — the newly minted token ID.

**Authorization:** Requires minter authorization.

**Errors:**
- `UserAlreadyHasTicket` (1) — recipient already owns a ticket

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_NFT_CONTRACT_ID> \
  --source <MINTER_SECRET_KEY> \
  --network testnet \
  -- mint_ticket_nft \
  --recipient <RECIPIENT_ADDRESS>
```

---

### `owner_of`

Returns the current owner of a token.

```rust
fn owner_of(env: Env, token_id: u128) -> Result<Address, Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token_id` | `u128` | Token ID to query |

**Returns:** `Address` — the owner's address.

**Errors:**
- `InvalidTokenId` (2) — token does not exist or was burned

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_NFT_CONTRACT_ID> \
  --network testnet \
  -- owner_of \
  --token_id 1
```

---

### `balance_of`

Returns the number of tickets owned by an address (0 or 1).

```rust
fn balance_of(env: Env, owner: Address) -> u128
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `owner` | `Address` | Address to query |

**Returns:** `u128` — ticket count (0 or 1).

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_NFT_CONTRACT_ID> \
  --network testnet \
  -- balance_of \
  --owner <OWNER_ADDRESS>
```

---

### `transfer_from`

Transfers a ticket from one address to another. Enforces one-ticket-per-user for the recipient.

```rust
fn transfer_from(env: Env, from: Address, to: Address, token_id: u128) -> Result<(), Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | `Address` | Current owner of the ticket |
| `to` | `Address` | Recipient address |
| `token_id` | `u128` | Token ID to transfer |

**Authorization:** Requires `from` authorization.

**Errors:**
- `InvalidTokenId` (2) — token does not exist or was burned
- `Unauthorized` (3) — `from` is not the token owner
- `RecipientAlreadyHasTicket` (4) — `to` already holds a ticket

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_NFT_CONTRACT_ID> \
  --source <OWNER_SECRET_KEY> \
  --network testnet \
  -- transfer_from \
  --from <OWNER_ADDRESS> \
  --to <RECIPIENT_ADDRESS> \
  --token_id 1
```

---

### `burn`

Burns a ticket NFT, permanently removing it.

```rust
fn burn(env: Env, token_id: u128)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token_id` | `u128` | Token ID to burn |

**Authorization:** Requires token owner authorization.

**Panics:**
- If `token_id` does not exist

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_NFT_CONTRACT_ID> \
  --source <OWNER_SECRET_KEY> \
  --network testnet \
  -- burn \
  --token_id 1
```

---

### `is_valid`

Checks whether a token exists and has not been burned.

```rust
fn is_valid(env: Env, token_id: u128) -> bool
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token_id` | `u128` | Token ID to check |

**Returns:** `bool` — `true` if the token exists.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_NFT_CONTRACT_ID> \
  --network testnet \
  -- is_valid \
  --token_id 1
```

---

### `get_minter`

Returns the minter address.

```rust
fn get_minter(env: Env) -> Address
```

**Returns:** `Address` — the authorized minter.

**Panics:**
- If the contract has not been initialized

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TICKET_NFT_CONTRACT_ID> \
  --network testnet \
  -- get_minter
```

---

## Storage Pattern

| Key | Storage Type | Description |
|-----|--------------|-------------|
| `Minter` | Instance | Address with minting privileges |
| `NextTokenId` | Instance | Auto-incrementing token ID counter |
| `Owner(u128)` | Persistent | Token ID → owner address |
| `Balance(Address)` | Persistent | Owner address → ticket count |
