#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/lib/logger.sh"
source "$SCRIPT_DIR/lib/config.sh"

NETWORK="${1:-}"
FORCE="${2:-}"

usage() {
  cat << EOF
Usage: $0 NETWORK [--force]

Clean deployment configuration for a network

ARGUMENTS:
  NETWORK    Network name to clean
  --force    Skip confirmation prompt

EXAMPLES:
  $0 testnet
  $0 mainnet --force

EOF
  exit 0
}

if [[ -z "$NETWORK" || "$NETWORK" == "--help" || "$NETWORK" == "-h" ]]; then
  usage
fi

main() {
  local config_file
  config_file=$(get_config_file "$NETWORK")
  
  if [[ ! -f "$config_file" ]]; then
    log_warn "No deployment found for network: $NETWORK"
    exit 0
  fi
  
  log_section "Clean Deployment Configuration"
  log_result "Network" "$NETWORK"
  log_result "Config File" "$config_file"
  echo ""
  
  log_info "Current configuration:"
  jq '.' "$config_file"
  echo ""
  
  if [[ "$FORCE" != "--force" ]]; then
    log_warn "This will delete the deployment configuration for $NETWORK"
    read -p "Are you sure? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      log_info "Cancelled"
      exit 0
    fi
  fi
  
  local backup
  if backup=$(cfg_backup "$NETWORK"); then
    log_success "Configuration backed up to: $backup"
  fi
  
  rm -f "$config_file"
  log_success "Deployment configuration cleaned for $NETWORK"
}

main
