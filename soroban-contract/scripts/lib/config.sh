#!/usr/bin/env bash

CONFIG_DIR="${CONFIG_DIR:-$PROJECT_DIR/deployments}"

ensure_config_dir() {
  mkdir -p "$CONFIG_DIR"
}

get_config_file() {
  local network="$1"
  echo "$CONFIG_DIR/${network}.json"
}

cfg_get() {
  local network="$1"
  local key="$2"
  local config_file
  config_file=$(get_config_file "$network")
  
  if [[ -f "$config_file" ]]; then
    jq -r ".$key // empty" "$config_file" 2>/dev/null || echo ""
  else
    echo ""
  fi
}

cfg_set() {
  local network="$1"
  local key="$2"
  local val="$3"
  local config_file
  config_file=$(get_config_file "$network")
  
  ensure_config_dir
  
  if [[ ! -f "$config_file" ]]; then
    echo '{}' > "$config_file"
  fi
  
  local tmp
  tmp=$(jq --arg k "$key" --arg v "$val" '.[$k] = $v' "$config_file")
  echo "$tmp" > "$config_file"
}

cfg_get_all() {
  local network="$1"
  local config_file
  config_file=$(get_config_file "$network")
  
  if [[ -f "$config_file" ]]; then
    cat "$config_file"
  else
    echo '{}'
  fi
}

cfg_exists() {
  local network="$1"
  local config_file
  config_file=$(get_config_file "$network")
  [[ -f "$config_file" ]]
}

cfg_backup() {
  local network="$1"
  local config_file
  config_file=$(get_config_file "$network")
  
  if [[ -f "$config_file" ]]; then
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${config_file}.backup_${timestamp}"
    cp "$config_file" "$backup_file"
    echo "$backup_file"
  fi
}

cfg_list_networks() {
  ensure_config_dir
  find "$CONFIG_DIR" -name "*.json" -not -name "*.backup_*" -exec basename {} .json \;
}
