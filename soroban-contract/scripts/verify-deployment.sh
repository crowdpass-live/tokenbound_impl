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

usage() {
  cat << EOF
Usage: $0 --network NETWORK --source SOURCE

Verify deployed contracts on a network

OPTIONS:
  --network NETWORK    Target network
  --source SOURCE      Source identity or secret key
  --help              Show this help message

EXAMPLES:
  $0 --network testnet --source deployer
  $0 --network mainnet --source S...

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
    exit 1
  fi

  if ! validate_network "$NETWORK"; then
    log_error "Invalid network: $NETWORK"
    exit 1
  fi

  if ! validate_source "$SOURCE"; then
    log_error "Invalid source: $SOURCE"
    exit 1
  fi
  
  if ! cfg_exists "$NETWORK"; then
    log_error "No deployment found for network: $NETWORK"
    exit 1
  fi
}

verify_all_contracts() {
  log_section "Verifying Contracts on $NETWORK"
  
  local tba_registry_id
  local ticket_factory_id
  local event_manager_id
  
  tba_registry_id=$(cfg_get "$NETWORK" "tba_registry_id")
  ticket_factory_id=$(cfg_get "$NETWORK" "ticket_factory_id")
  event_manager_id=$(cfg_get "$NETWORK" "event_manager_id")
  
  local errors=0
  
  if [[ -n "$tba_registry_id" ]]; then
    log_info "Verifying tba_registry: $tba_registry_id"
    if verify_contract "tba_registry" "$tba_registry_id" "total_deployed_accounts" "$NETWORK" "$SOURCE" \
      --token_contract "$tba_registry_id" --token_id 0; then
      :
    else
      errors=$((errors + 1))
    fi
  else
    log_warn "tba_registry not found in deployment config"
  fi
  
  if [[ -n "$ticket_factory_id" ]]; then
    log_info "Verifying ticket_factory: $ticket_factory_id"
    if verify_contract "ticket_factory" "$ticket_factory_id" "get_total_tickets" "$NETWORK" "$SOURCE"; then
      :
    else
      errors=$((errors + 1))
    fi
  else
    log_warn "ticket_factory not found in deployment config"
  fi
  
  if [[ -n "$event_manager_id" ]]; then
    log_info "Verifying event_manager: $event_manager_id"
    if verify_contract "event_manager" "$event_manager_id" "get_event_count" "$NETWORK" "$SOURCE"; then
      :
    else
      errors=$((errors + 1))
    fi
  else
    log_warn "event_manager not found in deployment config"
  fi
  
  echo ""
  if [[ $errors -eq 0 ]]; then
    log_success "All contracts verified successfully"
    return 0
  else
    log_error "Verification failed with $errors error(s)"
    return 1
  fi
}

main() {
  parse_args "$@"
  validate_inputs
  verify_all_contracts
}

main "$@"
