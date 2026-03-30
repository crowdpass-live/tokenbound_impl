//! Shared upgrade mechanism for CrowdPass Soroban contracts.
//!
//! Provides:
//! - Admin-controlled upgrade with WASM hash replacement
//! - Version tracking in instance storage
//! - Timelock: upgrade must be scheduled, then committed after `UPGRADE_DELAY_LEDGERS`
//! - Emergency pause / unpause
//! - Event emissions for every state change

#![no_std]

use soroban_sdk::{contracttype, symbol_short, Address, BytesN, Env, Symbol};

// ~24 hours at 5-second ledger close time
pub const UPGRADE_DELAY_LEDGERS: u32 = 17_280;

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

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&UpgradeKey::Admin)
        .expect("admin not set")
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
    env.events().publish(
        (Symbol::new(env, "upgrade_scheduled"),),
        (
            new_wasm_hash,
            scheduled_at,
            scheduled_at + UPGRADE_DELAY_LEDGERS,
        ),
    );
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

    env.events().publish(
        (Symbol::new(env, "upgraded"),),
        (new_wasm_hash, old_version, new_version),
    );
}

/// Transfer admin rights. Current admin only.
pub fn transfer_admin(env: &Env, new_admin: Address) {
    require_admin(env);
    let old_admin = get_admin(env);
    set_admin(env, &new_admin);
    env.events()
        .publish((Symbol::new(env, "admin_changed"),), (old_admin, new_admin));
}
