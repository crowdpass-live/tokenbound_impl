# Deployment Scripts

Automated deployment scripts for CrowdPass smart contracts.

## Prerequisites

- [Stellar CLI (`soroban`)](https://developers.stellar.org/docs/tools/developer-tools) installed
- A funded Stellar identity configured:
  ```bash
  soroban keys generate deployer --network testnet
  ```

## Usage

### Deploy to testnet

```bash
cd soroban-contract
./scripts/deploy.sh --network testnet --source deployer
```

### Deploy to mainnet

```bash
cd soroban-contract
./scripts/deploy.sh --network mainnet --source deployer
```

## Deployment Order

The script deploys contracts in dependency order:

```
1. tba_account    → install WASM (deployed on-demand by registry)
2. ticket_nft     → install WASM (deployed on-demand by factory)
3. tba_registry   → deploy + constructor(tba_account_wasm_hash)
4. ticket_factory → deploy + constructor(admin, ticket_nft_wasm_hash)
5. event_manager  → deploy + initialize(ticket_factory_address)
```

## Output

Deployed addresses are saved to `deployments/<network>.json`:

```json
{
  "tba_account_wasm_hash": "abc123...",
  "ticket_nft_wasm_hash": "def456...",
  "tba_registry_id": "CABC...",
  "ticket_factory_id": "CDEF...",
  "event_manager_id": "CGHI...",
  "event_manager_initialized": "true"
}
```

## Idempotency

The script skips any contract already recorded in the config file. To force a full redeploy, delete the corresponding `deployments/<network>.json` file.

## Verification

After deployment, the script automatically calls read-only functions on each deployed contract to confirm they are live and responding.
