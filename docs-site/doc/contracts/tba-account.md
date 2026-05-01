# TBA Account Contract

The **TBA Account Contract** represents an individual token-bound account owned by a specific NFT. It implements Soroban's `CustomAccountInterface` for native account abstraction, allowing the NFT owner to execute arbitrary cross-contract calls through the TBA.

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Account has already been initialized |
| 2 | `NotInitialized` | Account has not been initialized yet |

---

## Functions

### `initialize`

Initializes the TBA with NFT ownership details. Called once by the TBA Registry after deployment.

```rust
fn initialize(
    env: Env,
    token_contract: Address,
    token_id: u128,
    implementation_hash: BytesN<32>,
    salt: BytesN<32>,
) -> Result<(), Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token_contract` | `Address` | NFT contract address that owns this TBA |
| `token_id` | `u128` | Token ID of the owning NFT |
| `implementation_hash` | `BytesN<32>` | Hash of the TBA implementation contract |
| `salt` | `BytesN<32>` | Unique salt used for deterministic address calculation |

**Errors:**
- `AlreadyInitialized` (1) — called more than once

**Soroban CLI Example:**

```bash
# Typically called automatically by the TBA Registry during create_account.
# Manual invocation (if needed):
soroban contract invoke \
  --id <TBA_ACCOUNT_CONTRACT_ID> \
  --source <DEPLOYER_SECRET_KEY> \
  --network testnet \
  -- initialize \
  --token_contract <NFT_CONTRACT_ADDRESS> \
  --token_id 1 \
  --implementation_hash <IMPL_HASH_HEX> \
  --salt <SALT_HEX>
```

---

### `execute`

Executes a cross-contract call from the TBA. Only the current NFT owner can invoke this. Increments the nonce on each call.

```rust
fn execute(env: Env, to: Address, func: Symbol, args: Vec<Val>) -> Result<Vec<Val>, Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `to` | `Address` | Target contract address |
| `func` | `Symbol` | Function name to call on the target |
| `args` | `Vec<Val>` | Arguments to pass to the function |

**Returns:** `Vec<Val>` — return values from the target contract call.

**Authorization:** Requires NFT owner authorization.

**Errors:**
- `NotInitialized` (2) — account not yet initialized

**Events emitted:** `TransactionExecuted { to, func, nonce }`

**Soroban CLI Example:**

```bash
# Execute a token transfer from the TBA
soroban contract invoke \
  --id <TBA_ACCOUNT_CONTRACT_ID> \
  --source <NFT_OWNER_SECRET_KEY> \
  --network testnet \
  -- execute \
  --to <TARGET_CONTRACT> \
  --func "transfer" \
  --args '[{"address": "<RECIPIENT>"}, {"i128": 1000000}]'
```

---

### `owner`

Returns the current owner of the NFT by querying the NFT contract. Ownership is dynamic — if the NFT is transferred, the TBA owner changes automatically.

```rust
fn owner(env: Env) -> Result<Address, Error>
```

**Returns:** `Address` — current NFT owner.

**Errors:**
- `NotInitialized` (2) — account not yet initialized

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_ACCOUNT_CONTRACT_ID> \
  --network testnet \
  -- owner
```

---

### `token_contract`

Returns the NFT contract address associated with this TBA.

```rust
fn token_contract(env: Env) -> Result<Address, Error>
```

**Returns:** `Address` — NFT contract address.

**Errors:**
- `NotInitialized` (2)

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_ACCOUNT_CONTRACT_ID> \
  --network testnet \
  -- token_contract
```

---

### `token_id`

Returns the token ID of the NFT associated with this TBA.

```rust
fn token_id(env: Env) -> Result<u128, Error>
```

**Returns:** `u128` — NFT token ID.

**Errors:**
- `NotInitialized` (2)

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_ACCOUNT_CONTRACT_ID> \
  --network testnet \
  -- token_id
```

---

### `token`

Returns token details as a tuple, following the ERC-6551 pattern.

```rust
fn token(env: Env) -> Result<(u32, Address, u128), Error>
```

**Returns:** `(chain_id, token_contract, token_id)` — chain_id is `0` (placeholder on Soroban).

**Errors:**
- `NotInitialized` (2)

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_ACCOUNT_CONTRACT_ID> \
  --network testnet \
  -- token
```

---

### `nonce`

Returns the current transaction nonce. Incremented on each `execute` call.

```rust
fn nonce(env: Env) -> u64
```

**Returns:** `u64` — current nonce value (starts at 0).

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_ACCOUNT_CONTRACT_ID> \
  --network testnet \
  -- nonce
```

---

### `__check_auth`

Custom account authentication hook. Verifies that the NFT owner has authorized the transaction. Called automatically by the Soroban runtime during authorization.

```rust
fn __check_auth(
    env: Env,
    signature_payload: BytesN<32>,
    signatures: Vec<BytesN<64>>,
    auth_context: Vec<Context>,
) -> Result<(), Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `signature_payload` | `BytesN<32>` | Hash of the transaction to verify |
| `signatures` | `Vec<BytesN<64>>` | Provided signatures |
| `auth_context` | `Vec<Context>` | Authorization context from the runtime |

**Errors:**
- `NotInitialized` (2)

> This function is not called directly — it is invoked by the Soroban runtime as part of the `CustomAccountInterface`.

---

## Storage Pattern

| Key | Storage Type | Description |
|-----|--------------|-------------|
| `TokenContract` | Instance | NFT contract address |
| `TokenId` | Instance | NFT token ID |
| `ImplementationHash` | Instance | Deployment implementation hash |
| `Salt` | Instance | Deployment salt |
| `Initialized` | Instance | Boolean initialization flag |
| `Nonce` | Instance | Transaction counter |
