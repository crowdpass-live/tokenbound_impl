#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logger.sh"
source "$SCRIPT_DIR/lib/network.sh"

NETWORK="${1:-}"

usage() {
  cat << EOF
Usage: $0 [NETWORK]

Show network information and connectivity status

ARGUMENTS:
  NETWORK    Network name (optional, shows all if not specified)

EXAMPLES:
  $0
  $0 testnet
  $0 mainnet

EOF
  exit 0
}

if [[ "$NETWORK" == "--help" || "$NETWORK" == "-h" ]]; then
  usage
fi

show_network_info() {
  local network="$1"
  
  log_section "Network: $network"
  
  local rpc_url
  local passphrase
  rpc_url=$(get_network_rpc_url "$network")
  passphrase=$(get_network_passphrase "$network")
  
  log_result "RPC URL" "$rpc_url"
  log_result "Passphrase" "$passphrase"
  
  log_info "Checking connectivity..."
  if check_network_connectivity "$network"; then
    log_success "Network is reachable"
  else
    log_warn "Network connectivity check failed"
  fi
}

main() {
  if [[ -n "$NETWORK" ]]; then
    if ! validate_network "$NETWORK"; then
      log_error "Invalid network: $NETWORK"
      log_info "Supported networks: ${SUPPORTED_NETWORKS[*]}"
      exit 1
    fi
    show_network_info "$NETWORK"
  else
    log_section "Supported Networks"
    for network in "${SUPPORTED_NETWORKS[@]}"; do
      echo ""
      show_network_info "$network"
    done
  fi
}

main
