//! Reusable emergency-stop primitives for Soroban contracts.
//!
//! Drop these calls into a contract that needs a pause switch:
//!
//! - `pause(&env)` / `unpause(&env)` flip the flag and emit an event.
//! - `is_paused(&env)` reports the current state.
//! - `require_not_paused(&env)` is a one-line guard for state-mutating
//!   entry points.
//!
//! Authorization is intentionally the caller's concern. The contract should
//! gate its own `pause` / `unpause` entry points (e.g. with
//! `admin.require_auth()`) before delegating here, so this module can be
//! reused regardless of how the host contract models admin rights.

#![no_std]

use soroban_sdk::{contracttype, symbol_short, Env};

#[contracttype]
#[derive(Clone)]
pub enum PausableKey {
    /// Whether the contract is currently paused.
    Paused,
}

/// Read the pause flag. Defaults to `false` when never set.
pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&PausableKey::Paused)
        .unwrap_or(false)
}

/// Set the pause flag to `true` and emit a `paused` event.
///
/// The caller is responsible for authorizing this action.
pub fn pause(env: &Env) {
    env.storage().instance().set(&PausableKey::Paused, &true);
    env.events().publish((symbol_short!("paused"),), ());
}

/// Set the pause flag to `false` and emit an `unpaused` event.
///
/// The caller is responsible for authorizing this action.
pub fn unpause(env: &Env) {
    env.storage().instance().set(&PausableKey::Paused, &false);
    env.events().publish((symbol_short!("unpaused"),), ());
}

/// Panic if the contract is currently paused. Call at the top of any
/// state-mutating function that must be blocked during an emergency stop.
pub fn require_not_paused(env: &Env) {
    if is_paused(env) {
        panic!("contract is paused");
    }
}

#[cfg(test)]
mod test;
