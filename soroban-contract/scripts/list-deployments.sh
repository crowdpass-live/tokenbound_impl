#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logger.sh"
source "$SCRIPT_DIR/lib/config.sh"

NETWORK="${1:-}"

usage() {
  cat << EOF
Usage: $0 [NETWORK]

List deployed contracts for a specific network or all networks

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

list_network_deployments() {
  local network="$1"
  local config_file
  config_file=$(get_config_file "$network")
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "No deployments found for network: $network"
    return 1
  fi
  
  log_section "Deployments on $network"
  
  local contracts
  contracts=$(jq -r 'to_entries[] | select(.key | endswith("_id") or endswith("_hash")) | "\(.key)=\(.value)"' "$config_file")
  
  if [[ -z "$contracts" ]]; then
    log_info "No contracts deployed"
    return 0
  fi
  
  while IFS= read -r line; do
    local key="${line%%=*}"
    local value="${line#*=}"
    log_result "$key" "$value"
  done <<< "$contracts"
  
  echo ""
  log_info "Full configuration:"
  jq '.' "$config_file"
}

main() {
  if [[ -n "$NETWORK" ]]; then
    list_network_deployments "$NETWORK"
  else
    log_section "All Network Deployments"
    
    local networks
    networks=$(cfg_list_networks)
    
    if [[ -z "$networks" ]]; then
      log_info "No deployments found"
      exit 0
    fi
    
    while IFS= read -r network; do
      echo ""
      list_network_deployments "$network"
    done <<< "$networks"
  fi
}

main
