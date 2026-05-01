# Reentrancy Guard Pattern

Soroban contracts should avoid recursive state changes during external calls. The `reentrancy_guard` helper provides a lightweight lock pattern for contracts that need to protect a single critical section.

## Why it matters

- Prevents nested calls from re-entering a state-mutating method
- Enforces the checks-effects-interactions pattern
- Reduces risk when transferring tokens or calling other contracts

## Usage

```rust
use reentrancy_guard::{enter, exit};

pub fn release(env: Env, token: Address) -> Result<(), Error> {
    enter(&env)?;
    // ... perform state updates and cross-contract calls ...
    exit(&env);
    Ok(())
}
```

## Example

The existing `payment_splitter` contract demonstrates this pattern. It sets a lock before distributing funds, and clears the lock after the operation completes.

## API

- `is_locked(env: &Env) -> bool`
- `enter(env: &Env) -> Result<(), Error>`
- `exit(env: &Env)`

If `enter` is called while the guard is already active, it returns `Error::Reentrant`.
