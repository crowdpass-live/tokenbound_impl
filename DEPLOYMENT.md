# Contract Deployment Guide (Stellar Testnet)

This guide explains how to deploy all smart contracts to the Stellar Soroban testnet.

---

### 1. Prerequisites

Ensure you have the following installed:

- Rust (latest stable)
- Soroban CLI
- Stellar CLI
- A funded Stellar testnet account (via Friendbot)

### Install Soroban CLI
```bash
cargo install --locked soroban-cli
```

### Add WASM target
```bash
rustup target add wasm32-unknown-unknown
```
### 2. Setup Environment
Create environment variables:
```bash
export NETWORK=testnet
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
export ADMIN_SECRET_KEY="S..."
export ADMIN_ADDRESS="G..."
```
Fund your account:
```bash
curl "https://friendbot.stellar.org?addr=$ADMIN_ADDRESS"
```

### 3. Build Contracts
From the root directory:
```bash
cargo build --target wasm32-unknown-unknown --release
```
Optimise contracts:
```bash
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/*.wasm
```

### 4. Deployment Order
Deploy contracts in the following order:
1. `ticket_factory`
2. `event_manager`
3. `tba_registry`

### 5. Deploy Contracts
**Deploy Ticket Factory**
```bash
soroban contract deploy \
  --wasm <path_to_ticket_factory.wasm> \
  --source $ADMIN_SECRET_KEY \
  --rpc-url $SOROBAN_RPC_URL
```
Save the returned Contract ID:
```bash
export TICKET_FACTORY_ID="C..."
```
**Deploy Event Manager**
```bash
soroban contract deploy \
  --wasm <path_to_event_manager.wasm> \
  --source $ADMIN_SECRET_KEY \
  --rpc-url $SOROBAN_RPC_URL
```
```bash
export EVENT_MANAGER_ID="C..."
```
**Deploy TBA Registry**
```bash
soroban contract deploy \
  --wasm <path_to_tba_registry.wasm> \
  --source $ADMIN_SECRET_KEY \
  --rpc-url $SOROBAN_RPC_URL
```
```bash
export TBA_REGISTRY_ID="C..."
```

### 6. Contract Initialization
Initialize each contract with required parameters.

Example:
```bash
soroban contract invoke \
  --id $TICKET_FACTORY_ID \
  --source $ADMIN_SECRET_KEY \
  --rpc-url $SOROBAN_RPC_URL \
  -- initialize \
  --admin $ADMIN_ADDRESS
```
Repeat for other contracts using their respective parameters.

### 7. Verification Steps
After deployment:
- Confirm contract IDs are returned
- Call a read method:
```bash
soroban contract invoke \
  --id $TICKET_FACTORY_ID \
  --source $ADMIN_SECRET_KEY \
  --rpc-url $SOROBAN_RPC_URL \
  -- some_view_function
```
- Ensure no errors are returned
- Check events on Soroban explorer


### 8. Troubleshooting
**Contract fails to deploy**
- Ensure account has enough XLM
- Check RPC URL

**WASM not found**
- Ensure build step completed successfully

**Initialization fails**
- Ensure correct parameters are passed
- Check contract already initialized

**CLI errors**
```bash
soroban --version
```

### 9. Notes
- Always deploy in the correct order
- Store contract IDs securely
- Never expose secret keys in code

