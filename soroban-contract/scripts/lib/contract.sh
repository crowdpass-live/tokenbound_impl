#!/usr/bin/env bash

WASM_DIR="${WASM_DIR:-target/wasm32-unknown-unknown/release}"

get_wasm_path() {
  local contract_name="$1"
  echo "$PROJECT_DIR/$WASM_DIR/${contract_name}.wasm"
}

check_wasm_exists() {
  local contract_name="$1"
  local wasm_path
  wasm_path=$(get_wasm_path "$contract_name")
  [[ -f "$wasm_path" ]]
}

build_contracts() {
  local build_mode="${1:-release}"
  
  log_info "Building contracts in $build_mode mode..."
  
  if [[ "$build_mode" == "release" ]]; then
    (cd "$PROJECT_DIR" && soroban contract build --release)
  else
    (cd "$PROJECT_DIR" && soroban contract build)
  fi
  
  if [[ $? -eq 0 ]]; then
    log_success "Contracts built successfully"
    return 0
  else
    log_error "Contract build failed"
    return 1
  fi
}

install_wasm() {
  local contract_name="$1"
  local network="$2"
  local source="$3"
  local wasm_path
  wasm_path=$(get_wasm_path "$contract_name")
  
  if ! check_wasm_exists "$contract_name"; then
    log_error "WASM not found: $wasm_path"
    return 1
  fi
  
  log_debug "Installing WASM for $contract_name from $wasm_path"
  
  soroban contract install \
    --wasm "$wasm_path" \
    --source "$source" \
    --network "$network" 2>&1
}

deploy_contract() {
  local contract_name="$1"
  local network="$2"
  local source="$3"
  shift 3
  local wasm_path
  wasm_path=$(get_wasm_path "$contract_name")
  
  if ! check_wasm_exists "$contract_name"; then
    log_error "WASM not found: $wasm_path"
    return 1
  fi
  
  log_debug "Deploying contract $contract_name from $wasm_path"
  
  soroban contract deploy \
    --wasm "$wasm_path" \
    --source "$source" \
    --network "$network" \
    -- "$@" 2>&1
}

invoke_contract() {
  local contract_id="$1"
  local fn_name="$2"
  local network="$3"
  local source="$4"
  shift 4
  
  log_debug "Invoking $fn_name on contract $contract_id"
  
  soroban contract invoke \
    --id "$contract_id" \
    --source "$source" \
    --network "$network" \
    -- "$fn_name" "$@" 2>&1
}

verify_contract() {
  local label="$1"
  local contract_id="$2"
  local fn_name="$3"
  local network="$4"
  local source="$5"
  shift 5
  
  log_debug "Verifying $label by calling $fn_name"
  
  local result
  if result=$(invoke_contract "$contract_id" "$fn_name" "$network" "$source" "$@" 2>&1); then
    log_success "$label verification passed: $fn_name returned $result"
    return 0
  else
    log_error "$label verification failed: $result"
    return 1
  fi
}

get_contract_hash() {
  local wasm_path="$1"
  
  if [[ ! -f "$wasm_path" ]]; then
    return 1
  fi
  
  sha256sum "$wasm_path" | awk '{print $1}'
}

list_deployed_contracts() {
  local network="$1"
  local config_file
  config_file=$(get_config_file "$network")
  
  if [[ ! -f "$config_file" ]]; then
    echo "No deployments found for network: $network"
    return 1
  fi
  
  log_section "Deployed Contracts on $network"
  jq -r 'to_entries[] | select(.key | endswith("_id")) | "\(.key): \(.value)"' "$config_file"
}
