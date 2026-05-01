#!/usr/bin/env bash

SUPPORTED_NETWORKS=("testnet" "mainnet" "futurenet" "standalone" "local")

validate_network() {
  local network="$1"
  for supported in "${SUPPORTED_NETWORKS[@]}"; do
    if [[ "$network" == "$supported" ]]; then
      return 0
    fi
  done
  return 1
}

get_network_rpc_url() {
  local network="$1"
  case "$network" in
    testnet)
      echo "https://soroban-testnet.stellar.org"
      ;;
    mainnet)
      echo "https://soroban-mainnet.stellar.org"
      ;;
    futurenet)
      echo "https://rpc-futurenet.stellar.org"
      ;;
    standalone)
      echo "http://localhost:8000/soroban/rpc"
      ;;
    local)
      echo "http://localhost:8000/soroban/rpc"
      ;;
    *)
      echo ""
      ;;
  esac
}

get_network_passphrase() {
  local network="$1"
  case "$network" in
    testnet)
      echo "Test SDF Network ; September 2015"
      ;;
    mainnet)
      echo "Public Global Stellar Network ; September 2015"
      ;;
    futurenet)
      echo "Test SDF Future Network ; October 2022"
      ;;
    standalone)
      echo "Standalone Network ; February 2017"
      ;;
    local)
      echo "Standalone Network ; February 2017"
      ;;
    *)
      echo ""
      ;;
  esac
}

check_network_connectivity() {
  local network="$1"
  local rpc_url
  rpc_url=$(get_network_rpc_url "$network")
  
  if [[ -z "$rpc_url" ]]; then
    return 1
  fi
  
  if command -v curl &> /dev/null; then
    if curl -s -f -m 5 "$rpc_url/health" &> /dev/null; then
      return 0
    fi
  fi
  
  return 1
}

get_network_info() {
  local network="$1"
  echo "Network: $network"
  echo "RPC URL: $(get_network_rpc_url "$network")"
  echo "Passphrase: $(get_network_passphrase "$network")"
}
