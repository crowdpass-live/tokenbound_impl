# Root Makefile for CrowdPass Project

.PHONY: setup build test test-contracts test-client deploy-testnet lint clean optimize docker-build docker-up docker-down

# Setup all dependencies
setup:
	@echo "Installing dependencies for all components..."
	cd client && npm install
	cd soroban-client && npm install
	cd tokenbound-client && npm install

# Build all components
build: build-contracts build-client

# Build Soroban contracts
build-contracts:
	@echo "Building Soroban contracts..."
	cd soroban-contract && cargo build --target wasm32-unknown-unknown --release

# Build Vite frontend
build-client:
	@echo "Building frontend client..."
	cd client && npm run build

# Run all tests
test: test-contracts test-client

# Run contract tests
test-contracts:
	@echo "Running contract tests..."
	cd soroban-contract && cargo test

# Run frontend tests
test-client:
	@echo "Running frontend tests..."
	cd client && npm run test:e2e

# Deploy contracts to testnet
deploy-testnet:
	@echo "Deploying contracts to testnet..."
	# Note: This assumes soroban-cli is installed and configured
	cd soroban-contract && cargo build --target wasm32-unknown-unknown --release
	# Example deployment for event_manager
	soroban contract deploy \
	  --wasm soroban-contract/target/wasm32-unknown-unknown/release/event_manager.wasm \
	  --network testnet

# Run all linters
lint:
	@echo "Running linters..."
	cd client && npm run lint

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	cd soroban-contract && cargo clean
	cd client && rm -rf dist
	cd client && rm -rf node_modules

# Optimize WASM files
optimize:
	@echo "Optimizing WASM files..."
	@find soroban-contract/target/wasm32-unknown-unknown/release -name "*.wasm" -exec soroban contract optimize --wasm {} \;

# Docker commands
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down
