# Soroban SDK Migration Guide: v22.0.0 → v25.0.0

## Overview

This document outlines the changes made to upgrade the CrowdPass Soroban smart contracts from SDK version 22.0.0 to 25.0.0, compatible with Protocol 25 on Stellar Mainnet.

## Changes Made

### 1. Workspace Configuration Update

**File**: `soroban-contract/Cargo.toml`

```toml
# Before
[workspace.dependencies]
soroban-sdk = "22.0.0"

# After
[workspace.dependencies]
soroban-sdk = "25.0.0"
```

### 2. Contract Deployment API Changes

**Breaking Change**: `deploy_v2()` method has been replaced with `deploy()` in Soroban SDK v23+.

#### Files Updated:

1. **`contracts/ticket_factory/src/lib.rs`** (Line 108)

   ```rust
   // Before
   .deploy_v2(wasm_hash, constructor_args)

   // After
   .deploy(wasm_hash, constructor_args)
   ```

2. **`contracts/tba_registry/src/lib.rs`** (Line 162)

   ```rust
   // Before
   .deploy_v2(wasm_hash, constructor_args)

   // After
   .deploy(wasm_hash, constructor_args)
   ```

## What Didn't Need Changes

The following patterns were reviewed and confirmed to be compatible with v25.0.0:

### ✅ Event Publishing

Event emission using `env.events().publish()` remains unchanged:

```rust
env.events().publish(
    (Symbol::new(&env, "event_name"),),
    (data1, data2, ...)
);
```

### ✅ Token Client Usage

The `soroban_sdk::token::Client` API remains the same:

```rust
let token_client = token::Client::new(&env, &token_address);
token_client.transfer(&from, &to, &amount);
```

### ✅ Storage API

All storage operations (instance, persistent, temporary) remain compatible:

```rust
env.storage().instance().set(&key, &value);
env.storage().persistent().get(&key);
env.storage().persistent().extend_ttl(&key, threshold, extend_to);
```

### ✅ Contract Invocation

Cross-contract calls using `env.invoke_contract()` work as before:

```rust
env.invoke_contract::<ReturnType>(
    &contract_address,
    &Symbol::new(&env, "function_name"),
    args
);
```

### ✅ Deployer Utilities

Other deployer methods remain unchanged:

- `env.deployer().upload_contract_wasm(wasm)`
- `env.deployer().with_current_contract(salt)`
- `env.deployer().with_address(address, salt)`
- `env.deployer().deployed_address()`
- `env.deployer().update_current_contract_wasm(hash)`

### ✅ Test Utilities

Test helper functions are still compatible:

- `Env::default()`
- `env.mock_all_auths()`
- `env.register(Contract, args)`
- `Address::generate(&env)`

## Protocol 25 New Features Available

With this upgrade, you can now leverage these new capabilities:

### 1. CAP-73: Stellar Asset Contract trust() Function

Create trustlines for classic G-accounts:

```rust
// New in v25
token_client.trust(&address);
```

### 2. CAP-78: Limited TTL Extensions

Set explicit maximum limits on TTL extensions:

```rust
// New methods with max limits
env.storage().persistent().extend_ttl_with_max(key, threshold, extend_to, max_extend);
```

### 3. CAP-79: Muxed Address Strkey Conversion

Convert between Stellar strkey format and muxed addresses:

```rust
use soroban_sdk::MuxedAddress;
let muxed = MuxedAddress::from_string(&env, &strkey_string);
let strkey = muxed.to_strkey();
```

### 4. CAP-80: Additional BN254 and BLS12-381 Host Functions

New cryptographic operations:

- BN254 Multi-Scalar Multiplication (MSM)
- BN254 modular arithmetic
- Curve membership checks

### 5. CAP-82: Checked Arithmetic for 256-bit Integers

Safe arithmetic operations that return `Option`:

```rust
let result = u256.checked_add(other);
let result = i256.checked_mul(other);
// Returns None instead of trapping on overflow
```

## Testing Recommendations

After this upgrade, run the following tests to ensure everything works:

```bash
# Build all contracts
cd soroban-contract
cargo build --target wasm32-unknown-unknown --release

# Run unit tests
cargo test

# Run integration tests
cargo test --test integration_test
```

## Breaking Changes in v23-v25 (For Reference)

While not affecting this codebase, be aware of these changes:

1. **v23**:
   - Unified Events (CAP-67)
   - State Archival (CAP-62, CAP-66)
   - Constructor support improvements

2. **v24**:
   - Stability improvements
   - Bug fixes

3. **v25**:
   - `deploy_v2()` → `deploy()`
   - BN254 operations (CAP-79)
   - Poseidon hash functions (CAP-75)
   - Improved spec shaking for smaller binaries

## Potential Future Optimizations

Consider these improvements in future updates:

1. **Spec Shaking v2** (Enabled by default in v26)
   - Automatically removes unused types and events
   - Results in smaller WASM binaries

2. **TTL Management Improvements**
   - Use `extend_ttl_with_max()` for better storage cost control
   - Implement more granular TTL strategies

3. **Enhanced Error Handling**
   - Leverage checked arithmetic for 256-bit integers
   - Better overflow protection

## Verification Checklist

- [x] Updated workspace Cargo.toml to use soroban-sdk = "25.0.0"
- [x] Replaced `deploy_v2()` with `deploy()` in ticket_factory
- [x] Replaced `deploy_v2()` with `deploy()` in tba_registry
- [x] Verified event publishing patterns are compatible
- [x] Verified token client usage is compatible
- [x] Verified storage API usage is compatible
- [x] Verified test utilities are compatible
- [x] No usage of deprecated APIs found

## References

- [Stellar Protocol 25 Documentation](https://developers.stellar.org/docs/networks/software-versions)
- [Soroban SDK Releases](https://github.com/stellar/rs-soroban-sdk/releases)
- [Protocol 25 Release Notes](https://developers.stellar.org/docs/networks/software-versions#protocol-25-mainnet-january-22-2026)

## Support

If you encounter issues after this upgrade:

1. Check the Soroban SDK changelog for breaking changes
2. Review contract test output for specific error messages
3. Consult the Stellar Developer Discord or forums
