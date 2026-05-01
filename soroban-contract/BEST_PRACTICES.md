# Soroban Rust Contract Development Best Practices

This guide outlines the best practices, patterns, and conventions for developing secure, efficient, and maintainable Soroban smart contracts for the CrowdPass ecosystem.

## 1. Storage and State Management

Soroban provides three types of storage: `Instance`, `Persistent`, and `Temporary`. Choosing the right type and managing its lifecycle is critical.

### Storage Types
- **Instance Storage (`env.storage().instance()`)**: Use for global contract configuration that applies to the whole contract (e.g., Admin address, WASM hashes, global counters). Instance storage shares a single TTL for all its entries.
- **Persistent Storage (`env.storage().persistent()`)**: Use for user-specific data or records that must not be deleted without explicit action (e.g., NFT ownership, balances, event data). Each key has its own TTL.
- **Temporary Storage (`env.storage().temporary()`)**: Use for data that is safe to expire or can be easily reconstructed (e.g., price oracles, non-critical cache).

### TTL (Time To Live) Management
Soroban requires explicit state rent payments (TTL extensions) to prevent data from being archived.
- **Always extend TTL on writes**: When creating or updating a persistent record, extend its TTL.
- **Extend TTL on reads**: Extend TTL when reading frequently accessed data to prevent it from expiring.
- **Use the Upgradeable Library**: Use the standard TTL extension helpers in our `upgradeable` library (e.g., `upg::extend_instance_ttl(&env)` and `upg::extend_persistent_ttl(&env, &key)`).

## 2. Authorization and Access Control

### Native Authentication
Always use Soroban's native authentication framework rather than building custom signature verification (unless specifically required for off-chain oracles or specialized ticketing flows).
- Call `address.require_auth()` to ensure the transaction has been signed by the specified address.
- Use `address.require_auth_for_args(args)` if you need to restrict authorization to specific arguments.

### Admin Privileges
- Store the admin address in Instance storage during initialization.
- Do not hardcode administrative addresses in the WASM.
- Require admin auth for sensitive operations (e.g., upgrades, pause/unpause).

## 3. Error Handling

- **Define Custom Errors**: Use the `#[contracterror]` macro on an enum with explicit integer values. This makes debugging easier and provides clear failure reasons to the frontend.
- **Return Results**: Use `Result<T, Error>` for functions that can fail instead of panicking, unless the state is unrecoverable. Unwrapping `Option`s without context should be avoided; map them to explicit errors instead.

```rust
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    Unauthorized = 2,
    InvalidAmount = 3,
}
```

## 4. Upgradability and Emergency Controls

Contracts should be immutable by default but upgradeable in practice to fix bugs or add features.

- **Timelocked Upgrades**: Use the `upgradeable` library to schedule upgrades. This provides a timelock (`UPGRADE_DELAY_LEDGERS`) that gives users time to review the new WASM hash before it is committed.
- **Pause Functionality**: Implement pause/unpause functionality to halt contract execution in case a critical vulnerability is discovered. Always check `require_not_paused()` in state-mutating functions.
- **Version Tracking**: Maintain a version counter that increments on every committed upgrade.

## 5. Security and Arithmetic

- **Safe Math**: Rust checks for overflow in debug mode, but panics in release. Use checked math operations (e.g., `checked_add`, `checked_mul`) when dealing with user-supplied inputs or monetary values to prevent overflow panics or unexpected behavior.
- **Reentrancy**: Soroban currently prevents reentrancy at the protocol level (a contract cannot be called again while it is already in the call stack). However, state should still be updated before making cross-contract calls (Checks-Effects-Interactions pattern) as a general best practice.

## 6. Deterministic Deployments

When deploying contracts from a factory (like `TicketFactory` or `TbaRegistry`):
- Use `env.deployer().with_current_contract(salt).deploy_v2(wasm_hash, args)`.
- Ensure the `salt` is unique and deterministic (e.g., hashing the event ID or NFT details) to prevent deployment collisions and allow frontends to predict contract addresses before deployment.

## 7. Performance and Optimization

- **Minimize Cross-Contract Calls**: Cross-contract calls incur high gas costs. Batch operations where possible or consolidate logic if it doesn't violate architectural boundaries.
- **Efficient Data Structures**: Keep storage values as small as possible. Use `u32` or `u64` instead of `u128` if the value will never exceed those bounds. 
- **String Limits**: Enforce maximum lengths on strings (`String` or `Bytes`) to prevent storage bloat (e.g., `MAX_STRING_BYTES` in `EventManager`).

## 8. Testing

- **Comprehensive Coverage**: Aim for high line and branch coverage (>70% enforced by CI).
- **Test Environments**: Use `Env::default()` and `env.mock_all_auths()` for straightforward testing of authenticated calls.
- **Fuzzing**: Use property-based testing (`proptest`) for critical math and boundary conditions.
- **Integration Tests**: Test cross-contract workflows (e.g., `EventManager` -> `TicketFactory` -> `TicketNFT`) to ensure they interact correctly.

## 9. Code Style

- Format your code with `cargo fmt`.
- Run `cargo clippy --all-targets -- -D warnings` and fix all warnings.
- Document public functions, structs, and enums using Rust doc comments (`///`). Describe arguments, return values, and authorization requirements.