#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logger.sh"
source "$SCRIPT_DIR/lib/config.sh"
source "$SCRIPT_DIR/lib/network.sh"
source "$SCRIPT_DIR/lib/contract.sh"
source "$SCRIPT_DIR/lib/identity.sh"

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:-}"
SKIP_BUILD="${SKIP_BUILD:-false}"
FORCE_REDEPLOY="${FORCE_REDEPLOY:-false}"
DRY_RUN="${DRY_RUN:-false}"
VERIFY="${VERIFY:-true}"

usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Deploy Soroban contracts to specified network

OPTIONS:
  --network NETWORK       Target network (testnet|mainnet|futurenet|standalone|local)
  --source SOURCE         Source identity or secret key
  --skip-build           Skip contract build step
  --force-redeploy       Force redeployment of existing contracts
  --dry-run              Show what would be deployed without executing
  --no-verify            Skip contract verification after deployment
  --help                 Show this help message

ENVIRONMENT VARIABLES:
  NETWORK                Default network (default: testnet)
  SOURCE                 Default source identity
  LOG_LEVEL              Logging level (DEBUG|INFO) (default: INFO)
  LOG_TIMESTAMP          Include timestamps in logs (default: true)

EXAMPLES:
  $0 --network testnet --source deployer
  $0 --network mainnet --source S... --skip-build
  NETWORK=futurenet SOURCE=test $0
  $0 --dry-run --network testnet --source deployer

EOF
  exit 0
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --network)
        NETWORK="$2"
        shift 2
        ;;
      --source)
        SOURCE="$2"
        shift 2
        ;;
      --skip-build)
        SKIP_BUILD=true
        shift
        ;;
      --force-redeploy)
        FORCE_REDEPLOY=true
        shift
        ;;
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --no-verify)
        VERIFY=false
        shift
        ;;
      --help)
        usage
        ;;
      *)
        log_error "Unknown argument: $1"
        usage
        ;;
    esac
  done
}

validate_inputs() {
  if [[ -z "$SOURCE" ]]; then
    log_error "Source identity or secret key is required"
    log_info "Use --source <identity_name> or --source <secret_key>"
    list_identities
    exit 1
  fi

  if ! validate_network "$NETWORK"; then
    log_error "Invalid network: $NETWORK"
    log_info "Supported networks: ${SUPPORTED_NETWORKS[*]}"
    exit 1
  fi

  if ! validate_source "$SOURCE"; then
    log_error "Invalid source: $SOURCE"
    log_info "Source must be a valid identity name or secret key"
    list_identities
    exit 1
  fi
}

show_deployment_plan() {
  log_section "Deployment Plan"
  log_result "Network" "$NETWORK"
  log_result "Source" "$SOURCE"
  log_result "Skip Build" "$SKIP_BUILD"
  log_result "Force Redeploy" "$FORCE_REDEPLOY"
  log_result "Dry Run" "$DRY_RUN"
  log_result "Verify" "$VERIFY"
  echo ""
  
  if cfg_exists "$NETWORK"; then
    log_info "Existing deployment found for $NETWORK"
    if [[ "$FORCE_REDEPLOY" == "true" ]]; then
      log_warn "Force redeploy enabled - existing contracts will be replaced"
    else
      log_info "Existing contracts will be skipped"
    fi
  else
    log_info "No existing deployment found - full deployment will proceed"
  fi
}

deploy_step_tba_account() {
  log_step 1 5 "Installing tba_account WASM"
  
  local hash_key="tba_account_wasm_hash"
  local existing_hash
  existing_hash=$(cfg_get "$NETWORK" "$hash_key")
  
  if [[ -n "$existing_hash" && "$FORCE_REDEPLOY" != "true" ]]; then
    log_skip "tba_account WASM already installed: $existing_hash"
    TBA_ACCOUNT_HASH="$existing_hash"
    return 0
  fi
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would install tba_account WASM"
    TBA_ACCOUNT_HASH="dry_run_hash"
    return 0
  fi
  
  local hash
  if hash=$(install_wasm "tba_account" "$NETWORK" "$SOURCE"); then
    TBA_ACCOUNT_HASH="$hash"
    cfg_set "$NETWORK" "$hash_key" "$hash"
    log_success "tba_account WASM installed: $hash"
  else
    log_error "Failed to install tba_account WASM: $hash"
    return 1
  fi
}

deploy_step_ticket_nft() {
  log_step 2 5 "Installing ticket_nft WASM"
  
  local hash_key="ticket_nft_wasm_hash"
  local existing_hash
  existing_hash=$(cfg_get "$NETWORK" "$hash_key")
  
  if [[ -n "$existing_hash" && "$FORCE_REDEPLOY" != "true" ]]; then
    log_skip "ticket_nft WASM already installed: $existing_hash"
    TICKET_NFT_HASH="$existing_hash"
    return 0
  fi
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would install ticket_nft WASM"
    TICKET_NFT_HASH="dry_run_hash"
    return 0
  fi
  
  local hash
  if hash=$(install_wasm "ticket_nft" "$NETWORK" "$SOURCE"); then
    TICKET_NFT_HASH="$hash"
    cfg_set "$NETWORK" "$hash_key" "$hash"
    log_success "ticket_nft WASM installed: $hash"
  else
    log_error "Failed to install ticket_nft WASM: $hash"
    return 1
  fi
}

deploy_step_tba_registry() {
  log_step 3 5 "Deploying tba_registry"
  
  local id_key="tba_registry_id"
  local existing_id
  existing_id=$(cfg_get "$NETWORK" "$id_key")
  
  if [[ -n "$existing_id" && "$FORCE_REDEPLOY" != "true" ]]; then
    log_skip "tba_registry already deployed: $existing_id"
    TBA_REGISTRY_ID="$existing_id"
    return 0
  fi
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would deploy tba_registry with tba_account_wasm_hash=$TBA_ACCOUNT_HASH"
    TBA_REGISTRY_ID="dry_run_contract_id"
    return 0
  fi
  
  local contract_id
  if contract_id=$(deploy_contract "tba_registry" "$NETWORK" "$SOURCE" \
    --tba_account_wasm_hash "$TBA_ACCOUNT_HASH"); then
    TBA_REGISTRY_ID="$contract_id"
    cfg_set "$NETWORK" "$id_key" "$contract_id"
    log_success "tba_registry deployed: $contract_id"
  else
    log_error "Failed to deploy tba_registry: $contract_id"
    return 1
  fi
}

deploy_step_ticket_factory() {
  log_step 4 5 "Deploying ticket_factory"
  
  local id_key="ticket_factory_id"
  local existing_id
  existing_id=$(cfg_get "$NETWORK" "$id_key")
  
  if [[ -n "$existing_id" && "$FORCE_REDEPLOY" != "true" ]]; then
    log_skip "ticket_factory already deployed: $existing_id"
    TICKET_FACTORY_ID="$existing_id"
    return 0
  fi
  
  local admin_address
  if ! admin_address=$(get_address_from_source "$SOURCE"); then
    log_error "Failed to get address from source"
    return 1
  fi
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would deploy ticket_factory with admin=$admin_address, ticket_wasm_hash=$TICKET_NFT_HASH"
    TICKET_FACTORY_ID="dry_run_contract_id"
    return 0
  fi
  
  local contract_id
  if contract_id=$(deploy_contract "ticket_factory" "$NETWORK" "$SOURCE" \
    --admin "$admin_address" \
    --ticket_wasm_hash "$TICKET_NFT_HASH"); then
    TICKET_FACTORY_ID="$contract_id"
    cfg_set "$NETWORK" "$id_key" "$contract_id"
    cfg_set "$NETWORK" "ticket_factory_admin" "$admin_address"
    log_success "ticket_factory deployed: $contract_id"
  else
    log_error "Failed to deploy ticket_factory: $contract_id"
    return 1
  fi
}

deploy_step_event_manager() {
  log_step 5 5 "Deploying and initializing event_manager"
  
  local id_key="event_manager_id"
  local init_key="event_manager_initialized"
  local existing_id
  existing_id=$(cfg_get "$NETWORK" "$id_key")
  
  if [[ -n "$existing_id" && "$FORCE_REDEPLOY" != "true" ]]; then
    log_skip "event_manager already deployed: $existing_id"
    EVENT_MANAGER_ID="$existing_id"
  else
    if [[ "$DRY_RUN" == "true" ]]; then
      log_info "[DRY RUN] Would deploy event_manager"
      EVENT_MANAGER_ID="dry_run_contract_id"
    else
      local contract_id
      if contract_id=$(deploy_contract "event_manager" "$NETWORK" "$SOURCE"); then
        EVENT_MANAGER_ID="$contract_id"
        cfg_set "$NETWORK" "$id_key" "$contract_id"
        log_success "event_manager deployed: $contract_id"
      else
        log_error "Failed to deploy event_manager: $contract_id"
        return 1
      fi
    fi
  fi
  
  local is_initialized
  is_initialized=$(cfg_get "$NETWORK" "$init_key")
  
  if [[ -n "$is_initialized" && "$FORCE_REDEPLOY" != "true" ]]; then
    log_skip "event_manager already initialized"
    return 0
  fi
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY RUN] Would initialize event_manager with ticket_factory=$TICKET_FACTORY_ID"
    return 0
  fi
  
  log_info "Initializing event_manager..."
  local result
  if result=$(invoke_contract "$EVENT_MANAGER_ID" "initialize" "$NETWORK" "$SOURCE" \
    --ticket_factory "$TICKET_FACTORY_ID"); then
    cfg_set "$NETWORK" "$init_key" "true"
    log_success "event_manager initialized"
  else
    log_error "Failed to initialize event_manager: $result"
    return 1
  fi
}

verify_deployment() {
  if [[ "$VERIFY" != "true" || "$DRY_RUN" == "true" ]]; then
    return 0
  fi
  
  log_section "Verifying Deployment"
  
  local errors=0
  
  if ! verify_contract "tba_registry" "$TBA_REGISTRY_ID" "total_deployed_accounts" "$NETWORK" "$SOURCE" \
    --token_contract "$TBA_REGISTRY_ID" --token_id 0; then
    errors=$((errors + 1))
  fi
  
  if ! verify_contract "ticket_factory" "$TICKET_FACTORY_ID" "get_total_tickets" "$NETWORK" "$SOURCE"; then
    errors=$((errors + 1))
  fi
  
  if ! verify_contract "event_manager" "$EVENT_MANAGER_ID" "get_event_count" "$NETWORK" "$SOURCE"; then
    errors=$((errors + 1))
  fi
  
  if [[ $errors -gt 0 ]]; then
    log_error "Deployment verification failed with $errors error(s)"
    return 1
  fi
  
  log_success "All contracts verified successfully"
  return 0
}

show_deployment_summary() {
  log_section "Deployment Summary"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "DRY RUN - No actual deployment performed"
    echo ""
  fi
  
  log_result "Network" "$NETWORK"
  log_result "Config File" "$(get_config_file "$NETWORK")"
  echo ""
  
  log_info "Deployed Contracts:"
  log_result "  tba_account WASM" "$TBA_ACCOUNT_HASH"
  log_result "  ticket_nft WASM" "$TICKET_NFT_HASH"
  log_result "  tba_registry" "$TBA_REGISTRY_ID"
  log_result "  ticket_factory" "$TICKET_FACTORY_ID"
  log_result "  event_manager" "$EVENT_MANAGER_ID"
  echo ""
  
  if [[ "$DRY_RUN" != "true" ]]; then
    log_info "Full configuration:"
    cfg_get_all "$NETWORK" | jq '.'
  fi
}

main() {
  parse_args "$@"
  validate_inputs
  
  log_section "Soroban Contract Deployment"
  show_deployment_plan
  
  if [[ "$SKIP_BUILD" != "true" ]]; then
    if ! build_contracts; then
      log_error "Build failed - aborting deployment"
      exit 1
    fi
  else
    log_skip "Contract build (--skip-build enabled)"
  fi
  
  if [[ "$DRY_RUN" != "true" ]]; then
    local backup
    if backup=$(cfg_backup "$NETWORK" 2>/dev/null); then
      log_info "Configuration backed up to: $backup"
    fi
  fi
  
  deploy_step_tba_account || exit 1
  deploy_step_ticket_nft || exit 1
  deploy_step_tba_registry || exit 1
  deploy_step_ticket_factory || exit 1
  deploy_step_event_manager || exit 1
  
  verify_deployment || exit 1
  
  show_deployment_summary
  
  log_success "Deployment completed successfully!"
}

main "$@"
