# TBA Registry Contract

The **TBA Registry Contract** is the factory and directory for creating and tracking Token Bound Account (TBA) instances. It ensures deterministic address calculation and prevents duplicate deployments.

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 1 | `AccountAlreadyDeployed` | A TBA already exists for this parameter combination |

---

## Functions

### `__constructor`

Initializes the registry with the TBA Account WASM hash. Called automatically on deployment.

```rust
fn __constructor(env: Env, tba_account_wasm_hash: BytesN<32>)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tba_account_wasm_hash` | `BytesN<32>` | WASM hash of the TBA Account contract to deploy |

**Soroban CLI Example:**

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/tba_registry.wasm \
  --source <ADMIN_SECRET_KEY> \
  --network testnet \
  -- --tba_account_wasm_hash <TBA_ACCOUNT_WASM_HASH>
```

---

### `create_account`

Deploys a new TBA account for an NFT and initializes it. The caller must be the NFT owner.

```rust
fn create_account(
    env: Env,
    implementation_hash: BytesN<32>,
    token_contract: Address,
    token_id: u128,
    salt: BytesN<32>,
) -> Result<Address, Error>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `implementation_hash` | `BytesN<32>` | Hash of the TBA account implementation |
| `token_contract` | `Address` | NFT contract address |
| `token_id` | `u128` | Token ID of the NFT |
| `salt` | `BytesN<32>` | Unique salt for address derivation |

**Returns:** `Address` — the deployed TBA account address.

**Authorization:** Requires NFT owner authorization (verified via cross-contract `owner_of` call).

**Errors:**
- `AccountAlreadyDeployed` (1) — account already exists for these parameters

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_REGISTRY_CONTRACT_ID> \
  --source <NFT_OWNER_SECRET_KEY> \
  --network testnet \
  -- create_account \
  --implementation_hash <IMPL_HASH_HEX> \
  --token_contract <NFT_CONTRACT_ADDRESS> \
  --token_id 1 \
  --salt <SALT_HEX>
```

---

### `get_account`

Calculates the deterministic address of a TBA account. If the account has been deployed, returns the stored address. Otherwise, computes the expected address.

```rust
fn get_account(
    env: Env,
    implementation_hash: BytesN<32>,
    token_contract: Address,
    token_id: u128,
    salt: BytesN<32>,
) -> Address
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `implementation_hash` | `BytesN<32>` | Hash of the TBA account implementation |
| `token_contract` | `Address` | NFT contract address |
| `token_id` | `u128` | Token ID of the NFT |
| `salt` | `BytesN<32>` | Deployment salt |

**Returns:** `Address` — the deterministic TBA address (deployed or predicted).

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_REGISTRY_CONTRACT_ID> \
  --network testnet \
  -- get_account \
  --implementation_hash <IMPL_HASH_HEX> \
  --token_contract <NFT_CONTRACT_ADDRESS> \
  --token_id 1 \
  --salt <SALT_HEX>
```

---

### `get_deployed_address`

Returns the deployed address for specific parameters, or `None` if not yet deployed.

```rust
fn get_deployed_address(
    env: Env,
    implementation_hash: BytesN<32>,
    token_contract: Address,
    token_id: u128,
    salt: BytesN<32>,
) -> Option<Address>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `implementation_hash` | `BytesN<32>` | Hash of the TBA account implementation |
| `token_contract` | `Address` | NFT contract address |
| `token_id` | `u128` | Token ID of the NFT |
| `salt` | `BytesN<32>` | Deployment salt |

**Returns:** `Option<Address>` — `Some(address)` if deployed, `None` otherwise.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_REGISTRY_CONTRACT_ID> \
  --network testnet \
  -- get_deployed_address \
  --implementation_hash <IMPL_HASH_HEX> \
  --token_contract <NFT_CONTRACT_ADDRESS> \
  --token_id 1 \
  --salt <SALT_HEX>
```

---

### `total_deployed_accounts`

Returns the number of TBA accounts deployed for a specific NFT.

```rust
fn total_deployed_accounts(env: Env, token_contract: Address, token_id: u128) -> u32
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `token_contract` | `Address` | NFT contract address |
| `token_id` | `u128` | Token ID of the NFT |

**Returns:** `u32` — count of deployed TBA accounts for this NFT.

**Soroban CLI Example:**

```bash
soroban contract invoke \
  --id <TBA_REGISTRY_CONTRACT_ID> \
  --network testnet \
  -- total_deployed_accounts \
  --token_contract <NFT_CONTRACT_ADDRESS> \
  --token_id 1
```

---

## Storage Pattern

| Key | Storage Type | Description |
|-----|--------------|-------------|
| `ImplementationWasmHash` | Instance | WASM hash of the TBA Account contract |
| `DeployedAccount(BytesN<32>, Address, u128, BytesN<32>)` | Persistent | Composite key → deployed TBA address |
| `AccountCount(Address, u128)` | Persistent | (token_contract, token_id) → deployment count |
