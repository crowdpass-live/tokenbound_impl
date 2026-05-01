#!/usr/bin/env bash

get_address_from_source() {
  local source="$1"
  
  if [[ "$source" =~ ^S[A-Z0-9]{55}$ ]]; then
    echo "$source"
    return 0
  fi
  
  local address
  if address=$(soroban keys address "$source" 2>/dev/null); then
    echo "$address"
    return 0
  fi
  
  return 1
}

validate_source() {
  local source="$1"
  
  if [[ "$source" =~ ^S[A-Z0-9]{55}$ ]]; then
    return 0
  fi
  
  if soroban keys show "$source" &>/dev/null; then
    return 0
  fi
  
  return 1
}

list_identities() {
  log_info "Available identities:"
  soroban keys list 2>/dev/null || echo "  No identities found"
}

generate_identity() {
  local name="$1"
  
  if soroban keys show "$name" &>/dev/null; then
    log_warn "Identity '$name' already exists"
    return 1
  fi
  
  soroban keys generate "$name"
  log_success "Generated identity: $name"
  return 0
}
