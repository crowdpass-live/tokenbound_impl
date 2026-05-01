//! Reference implementation of the CrowdPass upgradeable contract pattern.
//!
//! This contract is intentionally minimal: it stores a counter and exposes a
//! single state-mutating method (`increment`) plus a read method (`get`). Its
//! real purpose is to show the canonical wiring for upgrade-safe deployments
//! shared across every CrowdPass Soroban contract.
//!
//! # Pattern overview
//!
//! 1. The constructor stores an admin address and initialises the version
//!    counter via the shared `upgradeable` crate.
//! 2. Every state-mutating entry point begins with `upg::require_not_paused`
//!    so the admin can halt the contract during an incident.
//! 3. Upgrades follow a two-step timelock: `schedule_upgrade` records the new
//!    WASM hash and the ledger sequence; `commit_upgrade` swaps the code only
//!    after `UPGRADE_DELAY_LEDGERS` ledgers have elapsed. `cancel_upgrade`
//!    aborts a pending schedule.
//! 4. Admin transfer goes through the same module so that the version,
//!    pause state, and admin all share a single source of truth.
//! 5. A `version()` view exposes the monotonically increasing version that the
//!    library bumps on every successful commit.
//!
//! See `docs/upgradeable-pattern.md` for the full architectural explanation.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env};

use upgradeable as upg;

#[contracttype]
pub enum DataKey {
    Counter,
}

#[contract]
pub struct UpgradeableReference;

#[contractimpl]
impl UpgradeableReference {
    /// Initialise the contract with an admin. Mirrors the wiring used by every
    /// production contract: store admin, seed version 1, set initial state.
    pub fn __constructor(env: Env, admin: Address) {
        admin.require_auth();

        upg::set_admin(&env, &admin);
        upg::init_version(&env);

        // STORAGE: the counter is per-contract singleton state — exactly the
        // shape `instance` storage was designed for. It rides the contract
        // instance entry's TTL (already bumped via `extend_instance_ttl`),
        // so no separate persistent entry or extension call is needed.
        env.storage().instance().set(&DataKey::Counter, &0u32);
        upg::extend_instance_ttl(&env);
    }

    // ── Business logic ───────────────────────────────────────────────────

    /// Increment the counter. Demonstrates the standard pause guard placement:
    /// `require_not_paused` runs before any authentication or state change.
    pub fn increment(env: Env, caller: Address) -> u32 {
        upg::require_not_paused(&env);
        caller.require_auth();

        // STORAGE: read + write against the same instance entry. Single
        // `extend_instance_ttl` at the end covers the whole instance,
        // including the Counter slot.
        let current: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0);
        let next = current.checked_add(1).expect("counter overflow");
        env.storage().instance().set(&DataKey::Counter, &next);
        upg::extend_instance_ttl(&env);
        next
    }

    pub fn get(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0)
    }

    // ── Upgrade / admin surface ──────────────────────────────────────────
    //
    // These thin delegations are the public face of the upgrade pattern. Every
    // production contract should expose this same shape so off-chain tooling
    // (deploy scripts, dashboards, runbooks) can target it uniformly.

    pub fn schedule_upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        upg::schedule_upgrade(&env, new_wasm_hash);
    }

    pub fn cancel_upgrade(env: Env) {
        upg::cancel_upgrade(&env);
    }

    pub fn commit_upgrade(env: Env) {
        upg::commit_upgrade(&env);
    }

    /// Immediate (fast-path) upgrade — replaces the contract WASM in one call.
    ///
    /// # Security
    /// - Admin-only: `require_auth()` is enforced inside `upg::upgrade`.
    /// - The new WASM must already be uploaded via
    ///   `env.deployer().upload_contract_wasm(...)`.
    /// - This entry point skips the 24-hour timelock that gates
    ///   `schedule_upgrade` / `commit_upgrade`. Operators should reserve it
    ///   for emergencies (live exploit response) and prefer the timelocked
    ///   path for routine upgrades.
    /// - Increments the on-chain version counter and emits an `Upgraded`
    ///   event for off-chain audit trails.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        upg::upgrade(&env, new_wasm_hash);
    }

    /// Apply post-upgrade state-shape migrations and bump the version to
    /// `target_version`.
    ///
    /// # Security
    /// - Admin-only.
    /// - Panics if `target_version <= current_version` (downgrade guard
    ///   enforced by `upg::require_version_increase`).
    ///
    /// Each future schema change adds a `match target_version` arm with the
    /// transformation logic. The reference contract has no migrations yet,
    /// so the body is a pass-through that records the new version.
    pub fn migrate(env: Env, target_version: u32) {
        upg::require_admin(&env);
        upg::require_version_increase(&env, target_version);

        // Per-version migration logic lives here. Add new arms as the
        // contract's storage shape evolves; the wildcard arm is a no-op
        // for versions that don't need data migration.
        match target_version {
            _ => {}
        }

        upg::migration_completed(&env, target_version);
    }

    pub fn pause(env: Env) {
        upg::pause(&env);
    }

    pub fn unpause(env: Env) {
        upg::unpause(&env);
    }

    pub fn is_paused(env: Env) -> bool {
        upg::is_paused(&env)
    }

    pub fn transfer_admin(env: Env, new_admin: Address) {
        upg::transfer_admin(&env, new_admin);
    }

    pub fn admin(env: Env) -> Address {
        upg::get_admin(&env)
    }

    pub fn version(env: Env) -> u32 {
        upg::get_version(&env)
    }
}

#[cfg(test)]
mod test;
