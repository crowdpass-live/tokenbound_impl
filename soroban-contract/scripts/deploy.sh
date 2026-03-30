#!/usr/bin/env bash
#
# CrowdPass Contract Deployment Script
#
# Deploys all contracts in dependency order:
#   1. tba_account    (install WASM only — deployed on-demand by registry)
#   2. ticket_nft     (install WASM only — deployed on-demand by factory)
#   3. tba_registry   (deploy + constructor with tba_account wasm hash)
#   4. ticket_factory (deploy + constructor with admin + ticket_nft wasm hash)
#   5. event_manager  (deploy + initialize with ticket_factory address)
#
# Usage:
#   ./scripts/deploy.sh --network testnet --source <SECRET_KEY_OR_IDENTITY>
#   ./scripts/deploy.sh --network mainnet --source deployer
#
# Idempotent: skips contracts already recorded in the config file.

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
NETWORK="testnet"
SOURCE=""
WASM_DIR="target/wasm32-unknown-unknown/release"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_DIR="$PROJECT_DIR/deployments"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --network) NETWORK="$2"; shift 2 ;;
    --source)  SOURCE="$2";  shift 2 ;;
    *)         echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [[ -z "$SOURCE" ]]; then
  echo "Error: --source is required (secret key or identity name)"
  exit 1
fi

if [[ "$NETWORK" != "testnet" && "$NETWORK" != "mainnet" ]]; then
  echo "Error: --network must be 'testnet' or 'mainnet'"
  exit 1
fi

CONFIG_FILE="$CONFIG_DIR/$NETWORK.json"

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { echo -e "\033[1;34m[deploy]\033[0m $*"; }
ok()   { echo -e "\033[1;32m  ✓\033[0m $*"; }
skip() { echo -e "\033[1;33m  ⏭\033[0m $* (already deployed)"; }
err()  { echo -e "\033[1;31m  ✗\033[0m $*"; }

# Read a key from the JSON config (empty string if missing)
cfg_get() {
  local key="$1"
  if [[ -f "$CONFIG_FILE" ]]; then
    jq -r ".$key // empty" "$CONFIG_FILE" 2>/dev/null || echo ""
  else
    echo ""
  fi
}

# Write a key to the JSON config
cfg_set() {
  local key="$1" val="$2"
  mkdir -p "$CONFIG_DIR"
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo '{}' > "$CONFIG_FILE"
  fi
  local tmp
  tmp=$(jq --arg k "$key" --arg v "$val" '.[$k] = $v' "$CONFIG_FILE")
  echo "$tmp" > "$CONFIG_FILE"
}

# Install WASM and return its hash
install_wasm() {
  local name="$1"
  local wasm="$PROJECT_DIR/$WASM_DIR/${name}.wasm"
  if [[ ! -f "$wasm" ]]; then
    err "WASM not found: $wasm — run 'soroban contract build' first"
    exit 1
  fi
  soroban contract install \
    --wasm "$wasm" \
    --source "$SOURCE" \
    --network "$NETWORK"
}

# Deploy a contract with constructor args and return its contract ID
deploy_contract() {
  local name="$1"
  shift
  local wasm="$PROJECT_DIR/$WASM_DIR/${name}.wasm"
  soroban contract deploy \
    --wasm "$wasm" \
    --source "$SOURCE" \
    --network "$NETWORK" \
    -- "$@"
}

# Invoke a contract function
invoke() {
  local contract_id="$1" fn_name="$2"
  shift 2
  soroban contract invoke \
    --id "$contract_id" \
    --source "$SOURCE" \
    --network "$NETWORK" \
    -- "$fn_name" "$@"
}

# ── Build ─────────────────────────────────────────────────────────────────────
log "Building contracts..."
(cd "$PROJECT_DIR" && soroban contract build)
ok "Build complete"

# ── Step 1: Install tba_account WASM ──────────────────────────────────────────
log "Step 1/5: Installing tba_account WASM..."
TBA_ACCOUNT_HASH=$(cfg_get tba_account_wasm_hash)
if [[ -n "$TBA_ACCOUNT_HASH" ]]; then
  skip "tba_account WASM hash: $TBA_ACCOUNT_HASH"
else
  TBA_ACCOUNT_HASH=$(install_wasm tba_account)
  cfg_set tba_account_wasm_hash "$TBA_ACCOUNT_HASH"
  ok "tba_account WASM hash: $TBA_ACCOUNT_HASH"
fi

# ── Step 2: Install ticket_nft WASM ──────────────────────────────────────────
log "Step 2/5: Installing ticket_nft WASM..."
TICKET_NFT_HASH=$(cfg_get ticket_nft_wasm_hash)
if [[ -n "$TICKET_NFT_HASH" ]]; then
  skip "ticket_nft WASM hash: $TICKET_NFT_HASH"
else
  TICKET_NFT_HASH=$(install_wasm ticket_nft)
  cfg_set ticket_nft_wasm_hash "$TICKET_NFT_HASH"
  ok "ticket_nft WASM hash: $TICKET_NFT_HASH"
fi

# ── Step 3: Deploy tba_registry ───────────────────────────────────────────────
log "Step 3/5: Deploying tba_registry..."
TBA_REGISTRY_ID=$(cfg_get tba_registry_id)
if [[ -n "$TBA_REGISTRY_ID" ]]; then
  skip "tba_registry: $TBA_REGISTRY_ID"
else
  TBA_REGISTRY_ID=$(deploy_contract tba_registry \
    --tba_account_wasm_hash "$TBA_ACCOUNT_HASH")
  cfg_set tba_registry_id "$TBA_REGISTRY_ID"
  ok "tba_registry: $TBA_REGISTRY_ID"
fi

# ── Step 4: Deploy ticket_factory ─────────────────────────────────────────────
log "Step 4/5: Deploying ticket_factory..."
TICKET_FACTORY_ID=$(cfg_get ticket_factory_id)
if [[ -n "$TICKET_FACTORY_ID" ]]; then
  skip "ticket_factory: $TICKET_FACTORY_ID"
else
  # Admin is the deployer's public address
  ADMIN_ADDRESS=$(soroban keys address "$SOURCE" 2>/dev/null || echo "$SOURCE")
  TICKET_FACTORY_ID=$(deploy_contract ticket_factory \
    --admin "$ADMIN_ADDRESS" \
    --ticket_wasm_hash "$TICKET_NFT_HASH")
  cfg_set ticket_factory_id "$TICKET_FACTORY_ID"
  cfg_set ticket_factory_admin "$ADMIN_ADDRESS"
  ok "ticket_factory: $TICKET_FACTORY_ID"
fi

# ── Step 5: Deploy & initialize event_manager ─────────────────────────────────
log "Step 5/5: Deploying event_manager..."
EVENT_MANAGER_ID=$(cfg_get event_manager_id)
if [[ -n "$EVENT_MANAGER_ID" ]]; then
  skip "event_manager: $EVENT_MANAGER_ID"
else
  EVENT_MANAGER_ID=$(deploy_contract event_manager)
  cfg_set event_manager_id "$EVENT_MANAGER_ID"
  ok "event_manager deployed: $EVENT_MANAGER_ID"
fi

# Initialize event_manager (separate check so retries work if deploy succeeded but init failed)
EM_INITIALIZED=$(cfg_get event_manager_initialized)
if [[ -n "$EM_INITIALIZED" ]]; then
  skip "event_manager initialization"
else
  log "  Initializing event_manager with ticket_factory..."
  invoke "$EVENT_MANAGER_ID" initialize \
    --ticket_factory "$TICKET_FACTORY_ID"
  cfg_set event_manager_initialized "true"
  ok "event_manager initialized"
fi

# ── Verification ──────────────────────────────────────────────────────────────
log "Verifying deployment..."
ERRORS=0

verify_contract() {
  local label="$1" contract_id="$2" fn_name="$3"
  shift 3
  if result=$(invoke "$contract_id" "$fn_name" "$@" 2>&1); then
    ok "$label — $fn_name returned: $result"
  else
    err "$label — $fn_name failed: $result"
    ERRORS=$((ERRORS + 1))
  fi
}

verify_contract "tba_registry" "$TBA_REGISTRY_ID" \
  total_deployed_accounts \
  --token_contract "$TBA_REGISTRY_ID" --token_id 0

verify_contract "ticket_factory" "$TICKET_FACTORY_ID" \
  get_total_tickets

verify_contract "event_manager" "$EVENT_MANAGER_ID" \
  get_event_count

if [[ $ERRORS -gt 0 ]]; then
  err "Deployment verification failed with $ERRORS error(s)"
  exit 1
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
log "Deployment complete on $NETWORK!"
echo ""
echo "  Config saved to: $CONFIG_FILE"
echo ""
jq '.' "$CONFIG_FILE"
