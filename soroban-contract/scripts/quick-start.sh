#!/usr/bin/env bash

cat << 'EOF'
Soroban Deployment Scripts - Quick Start Guide

MAIN DEPLOYMENT SCRIPT
  ./scripts/deploy-v2.sh --network testnet --source deployer
  ./scripts/deploy-v2.sh --network mainnet --source S... --skip-build
  ./scripts/deploy-v2.sh --dry-run --network testnet --source deployer
  ./scripts/deploy-v2.sh --force-redeploy --network testnet --source deployer

UTILITY SCRIPTS
  List Deployments:
    ./scripts/list-deployments.sh
    ./scripts/list-deployments.sh testnet

  Verify Deployment:
    ./scripts/verify-deployment.sh --network testnet --source deployer

  Clean Deployment:
    ./scripts/clean-deployment.sh testnet
    ./scripts/clean-deployment.sh testnet --force

  Network Info:
    ./scripts/network-info.sh
    ./scripts/network-info.sh testnet

ENVIRONMENT VARIABLES
  export NETWORK=testnet
  export SOURCE=deployer
  export LOG_LEVEL=DEBUG
  export SKIP_BUILD=true
  export DRY_RUN=true

SUPPORTED NETWORKS
  - testnet
  - mainnet
  - futurenet
  - standalone
  - local

DEPLOYMENT ORDER
  1. tba_account (WASM install)
  2. ticket_nft (WASM install)
  3. tba_registry (deploy with tba_account hash)
  4. ticket_factory (deploy with ticket_nft hash)
  5. event_manager (deploy and initialize)

CONFIGURATION FILES
  Location: deployments/<network>.json
  Backup: deployments/<network>.json.backup_<timestamp>

EXAMPLES
  Full deployment:
    ./scripts/deploy-v2.sh --network testnet --source deployer

  Preview deployment:
    ./scripts/deploy-v2.sh --dry-run --network testnet --source deployer

  Skip build step:
    ./scripts/deploy-v2.sh --skip-build --network testnet --source deployer

  Force redeploy:
    ./scripts/deploy-v2.sh --force-redeploy --network testnet --source deployer

  Debug mode:
    LOG_LEVEL=DEBUG ./scripts/deploy-v2.sh --network testnet --source deployer

  Check deployments:
    ./scripts/list-deployments.sh testnet

  Verify contracts:
    ./scripts/verify-deployment.sh --network testnet --source deployer

  Clean config:
    ./scripts/clean-deployment.sh testnet

EOF
