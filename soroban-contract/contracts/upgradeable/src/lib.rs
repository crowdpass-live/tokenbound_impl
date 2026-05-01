//! Shared upgrade mechanism for CrowdPass Soroban contracts.
//!
//! Provides:
//! - Admin-controlled upgrade with WASM hash replacement
//! - Version tracking in instance storage
//! - Timelock: upgrade must be scheduled, then committed after `UPGRADE_DELAY_LEDGERS`
//! - Emergency pause / unpause
//! - Event emissions for every state change

#![no_std]

use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, IntoVal, Symbol, Val};

// ~24 hours at 5-second ledger close time
pub const UPGRADE_DELAY_LEDGERS: u32 = 17_280;
pub const LEDGER_SECONDS: u32 = 5;
pub const SECONDS_PER_DAY: u32 = 86_400;
pub const LEDGERS_PER_DAY: u32 = SECONDS_PER_DAY / LEDGER_SECONDS;
pub const DEFAULT_TTL_THRESHOLD_LEDGERS: u32 = 30 * LEDGERS_PER_DAY;
pub const DEFAULT_TTL_EXTEND_TO_LEDGERS: u32 = 100 * LEDGERS_PER_DAY;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradeScheduledEvent {
    pub contract_address: Address,
    pub new_wasm_hash: BytesN<32>,
    pub scheduled_at: u32,
    pub commit_at: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UpgradedEvent {
    pub contract_address: Address,
    pub new_wasm_hash: BytesN<32>,
    pub old_version: u32,
    pub new_version: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminChangedEvent {
    pub contract_address: Address,
    pub old_admin: Address,
    pub new_admin: Address,
}

/// Emitted when [`migration_completed`] runs successfully against a contract.
///
/// Migrations are state-shape transformations applied AFTER the WASM swap.
/// Off-chain indexers should treat this event as "the contract at version
/// `from_version` has been migrated to `to_version` and the new schema is
/// now in effect".
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MigratedEvent {
    pub contract_address: Address,
    pub from_version: u32,
    pub to_version: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum UpgradeKey {
    /// Contract administrator
    Admin,
    /// Current contract version (u32, monotonically increasing)
    Version,
    /// Whether the contract is paused
    Paused,
    /// Pending upgrade: (new_wasm_hash, scheduled_at_ledger)
    PendingUpgrade,
}

// ── Admin helpers ────────────────────────────────────────────────────────────

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&UpgradeKey::Admin, admin);
}

/// Returns the admin address when the contract has been initialized.
#[inline]
pub fn try_get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&UpgradeKey::Admin)
}

pub fn get_admin(env: &Env) -> Address {
    try_get_admin(env).expect("admin not set")
}

pub fn require_admin(env: &Env) {
    get_admin(env).require_auth();
}

// ── Version helpers ──────────────────────────────────────────────────────────

pub fn init_version(env: &Env) {
    env.storage().instance().set(&UpgradeKey::Version, &1u32);
}

pub fn get_version(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&UpgradeKey::Version)
        .unwrap_or(1)
}

fn bump_version(env: &Env) -> u32 {
    let next = get_version(env) + 1;
    env.storage().instance().set(&UpgradeKey::Version, &next);
    next
}

// ── Pause helpers ────────────────────────────────────────────────────────────

pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&UpgradeKey::Paused)
        .unwrap_or(false)
}

/// Pause the contract. Admin only.
pub fn pause(env: &Env) {
    require_admin(env);
    env.storage().instance().set(&UpgradeKey::Paused, &true);
    env.events()
        .publish((symbol_short!("paused"),), get_version(env));
}

/// Unpause the contract. Admin only.
pub fn unpause(env: &Env) {
    require_admin(env);
    env.storage().instance().set(&UpgradeKey::Paused, &false);
    env.events()
        .publish((symbol_short!("unpaused"),), get_version(env));
}

/// Call at the start of any state-mutating function to enforce the pause guard.
pub fn require_not_paused(env: &Env) {
    assert!(!is_paused(env), "contract is paused");
}

// ── Upgrade (timelock) ───────────────────────────────────────────────────────

/// Schedule an upgrade. Admin only.
/// The new WASM hash becomes effective only after `UPGRADE_DELAY_LEDGERS` ledgers.
pub fn schedule_upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
    require_admin(env);
    let scheduled_at = env.ledger().sequence();
    env.storage().instance().set(
        &UpgradeKey::PendingUpgrade,
        &(new_wasm_hash.clone(), scheduled_at),
    );
    let event = UpgradeScheduledEvent {
        contract_address: env.current_contract_address(),
        new_wasm_hash: new_wasm_hash.clone(),
        scheduled_at,
        commit_at: scheduled_at + UPGRADE_DELAY_LEDGERS,
    };
    env.events()
        .publish((Symbol::new(env, "UpgradeScheduled"),), event);
}

/// Cancel a pending upgrade. Admin only.
pub fn cancel_upgrade(env: &Env) {
    require_admin(env);
    env.storage().instance().remove(&UpgradeKey::PendingUpgrade);
    env.events()
        .publish((symbol_short!("upg_cncl"),), get_version(env));
}

/// Commit the pending upgrade after the timelock has elapsed. Admin only.
pub fn commit_upgrade(env: &Env) {
    require_admin(env);

    let (new_wasm_hash, scheduled_at): (BytesN<32>, u32) = env
        .storage()
        .instance()
        .get(&UpgradeKey::PendingUpgrade)
        .expect("no pending upgrade");

    let current_ledger = env.ledger().sequence();
    assert!(
        current_ledger >= scheduled_at + UPGRADE_DELAY_LEDGERS,
        "timelock not elapsed"
    );

    // Remove pending entry before upgrading (checks-effects-interactions)
    env.storage().instance().remove(&UpgradeKey::PendingUpgrade);

    let old_version = get_version(env);
    let new_version = bump_version(env);

    env.deployer()
        .update_current_contract_wasm(new_wasm_hash.clone());

    let event = UpgradedEvent {
        contract_address: env.current_contract_address(),
        new_wasm_hash: new_wasm_hash.clone(),
        old_version,
        new_version,
    };
    env.events()
        .publish((Symbol::new(env, "Upgraded"),), event);
}

/// Transfer admin rights. Current admin only.
pub fn transfer_admin(env: &Env, new_admin: Address) {
    require_admin(env);
    let old_admin = get_admin(env);
    set_admin(env, &new_admin);
    let event = AdminChangedEvent {
        contract_address: env.current_contract_address(),
        old_admin,
        new_admin: new_admin.clone(),
    };
    env.events()
        .publish((Symbol::new(env, "AdminChanged"),), event);
}

// ── Fast-path upgrade (no timelock) ──────────────────────────────────────────
//
// SECURITY NOTE
// -------------
// `upgrade(...)` performs an immediate WASM swap with no timelock. It exists
// alongside the safer `schedule_upgrade` / `commit_upgrade` two-step flow for
// situations where the slower timelocked path is unsuitable (e.g. responding
// to a live exploit). Because it skips the 24-hour grace window, a compromised
// admin key can use this entry point to replace the contract code instantly,
// so projects deploying this library SHOULD prefer the timelocked path for
// routine upgrades and reserve `upgrade()` for emergencies. Both paths share
// the same admin-auth + version-bump invariants.

/// Immediate (fast-path) upgrade: replace the contract WASM in a single call.
///
/// # Authorisation
/// Requires the current admin's signature via `require_auth()` — see the
/// SECURITY NOTE above before exposing this from a contract.
///
/// # Arguments
/// * `env` — the contract environment.
/// * `new_wasm_hash` — hash of the new WASM blob; must already be uploaded
///   on-chain via `env.deployer().upload_contract_wasm(...)`.
///
/// # Side effects
/// 1. Authenticates the admin.
/// 2. Increments the version counter (`get_version(env) + 1`).
/// 3. Calls `env.deployer().update_current_contract_wasm(new_wasm_hash)` to
///    swap the bytecode in place. The contract address does **not** change.
/// 4. Emits an [`UpgradedEvent`] for off-chain monitoring.
pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
    require_admin(env);

    let old_version = get_version(env);
    let new_version = bump_version(env);

    env.deployer()
        .update_current_contract_wasm(new_wasm_hash.clone());

    let event = UpgradedEvent {
        contract_address: env.current_contract_address(),
        new_wasm_hash,
        old_version,
        new_version,
    };
    env.events()
        .publish((Symbol::new(env, "Upgraded"),), event);
}

// ── Version / migration helpers ──────────────────────────────────────────────

/// Guard helper for `migrate(...)` entry points — panics if `target_version`
/// would be a downgrade or a no-op.
///
/// Use this at the top of every contract-specific `migrate` function to
/// enforce the "version must strictly increase" invariant. Calling it when
/// `target_version <= get_version(env)` panics with `"downgrade not allowed"`,
/// which surfaces to off-chain callers as a contract revert.
pub fn require_version_increase(env: &Env, target_version: u32) {
    let current = get_version(env);
    assert!(
        target_version > current,
        "downgrade not allowed"
    );
}

/// Mark an in-progress migration as complete and emit a [`MigratedEvent`].
///
/// Contracts call this from their `migrate(target_version)` function once
/// the contract-specific state-shape transformations have been applied. The
/// stored version is updated to `target_version` so subsequent calls to
/// `version()` reflect the migrated state.
///
/// # Authorisation
/// **Does not** call `require_auth()` itself — the surrounding `migrate`
/// entry point is expected to have authenticated the admin already, and
/// Soroban auth frames don't permit a second `require_auth` against the
/// same admin within the same call. Callers must invoke
/// [`require_admin`] before reaching this function.
///
/// # Panics
/// Panics if `target_version <= current_version` (no-op or downgrade).
pub fn migration_completed(env: &Env, target_version: u32) {
    let from_version = get_version(env);
    require_version_increase(env, target_version);
    env.storage()
        .instance()
        .set(&UpgradeKey::Version, &target_version);

    let event = MigratedEvent {
        contract_address: env.current_contract_address(),
        from_version,
        to_version: target_version,
    };
    env.events()
        .publish((Symbol::new(env, "Migrated"),), event);
}

// ── Storage TTL helpers ──────────────────────────────────────────────────────

pub fn default_ttl_threshold() -> u32 {
    DEFAULT_TTL_THRESHOLD_LEDGERS
}

pub fn default_ttl_extend_to() -> u32 {
    DEFAULT_TTL_EXTEND_TO_LEDGERS
}

pub fn extend_instance_ttl(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(default_ttl_threshold(), default_ttl_extend_to());
}

pub fn extend_persistent_ttl<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    env.storage()
        .persistent()
        .extend_ttl(key, default_ttl_threshold(), default_ttl_extend_to());
}

#[cfg(test)]
mod test;
