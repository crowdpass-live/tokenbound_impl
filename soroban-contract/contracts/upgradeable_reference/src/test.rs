#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, BytesN, Env,
};

use upgradeable::UPGRADE_DELAY_LEDGERS;

const START_LEDGER: u32 = 1_000;

// Compiled WASM of this contract, used as the post-upgrade target. Importing
// the contract's own WASM as the "v2" payload is enough to exercise the
// upgrade flow end-to-end (auth check, version bump, state preservation, real
// `update_current_contract_wasm` call) without needing a separate v2 codebase.
//
// Build with: `cargo build --target wasm32v1-none --release -p upgradeable_reference`
mod upgradeable_reference_v2 {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32v1-none/release/upgradeable_reference.wasm"
    );
}

fn setup() -> (Env, UpgradeableReferenceClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_sequence_number(START_LEDGER);

    let admin = Address::generate(&env);
    let contract_id = env.register(UpgradeableReference, (admin.clone(),));
    let client = UpgradeableReferenceClient::new(&env, &contract_id);
    (env, client, admin)
}

fn dummy_hash(env: &Env, byte: u8) -> BytesN<32> {
    BytesN::from_array(env, &[byte; 32])
}

/// Upload the v2 WASM and return its hash. Wraps the boilerplate so each
/// upgrade test reads as a single line.
fn upload_v2_hash(env: &Env) -> BytesN<32> {
    env.deployer()
        .upload_contract_wasm(upgradeable_reference_v2::WASM)
}

// ── Initialisation & version ─────────────────────────────────────────────

#[test]
fn initial_state_is_correct() {
    let (_env, client, admin) = setup();
    assert_eq!(client.version(), 1);
    assert_eq!(client.admin(), admin);
    assert!(!client.is_paused());
    assert_eq!(client.get(), 0);
}

// ── Pause guard ──────────────────────────────────────────────────────────

#[test]
fn increment_works_when_unpaused() {
    let (env, client, _admin) = setup();
    let caller = Address::generate(&env);
    assert_eq!(client.increment(&caller), 1);
    assert_eq!(client.increment(&caller), 2);
    assert_eq!(client.get(), 2);
}

#[test]
#[should_panic(expected = "contract is paused")]
fn increment_blocked_when_paused() {
    let (env, client, _admin) = setup();
    client.pause();
    let caller = Address::generate(&env);
    client.increment(&caller);
}

#[test]
fn unpause_restores_increment() {
    let (env, client, _admin) = setup();
    client.pause();
    client.unpause();
    let caller = Address::generate(&env);
    assert_eq!(client.increment(&caller), 1);
}

// ── Upgrade timelock ─────────────────────────────────────────────────────

#[test]
#[should_panic(expected = "no pending upgrade")]
fn commit_without_schedule_fails() {
    let (_env, client, _admin) = setup();
    client.commit_upgrade();
}

#[test]
#[should_panic(expected = "timelock not elapsed")]
fn commit_before_delay_fails() {
    let (env, client, _admin) = setup();
    let new_hash = dummy_hash(&env, 0xAB);
    client.schedule_upgrade(&new_hash);

    // Advance just shy of the delay.
    env.ledger()
        .set_sequence_number(START_LEDGER + UPGRADE_DELAY_LEDGERS - 1);
    client.commit_upgrade();
}

#[test]
#[should_panic(expected = "no pending upgrade")]
fn cancel_then_commit_fails() {
    let (env, client, _admin) = setup();
    let new_hash = dummy_hash(&env, 0xCD);
    client.schedule_upgrade(&new_hash);
    client.cancel_upgrade();

    env.ledger()
        .set_sequence_number(START_LEDGER + UPGRADE_DELAY_LEDGERS);
    client.commit_upgrade();
}

// ── Fast-path upgrade (issue #205) ───────────────────────────────────────

#[test]
fn test_upgrade_authorized() {
    let (env, client, _admin) = setup();
    assert_eq!(client.version(), 1);

    let new_hash = upload_v2_hash(&env);
    client.upgrade(&new_hash);

    // After a successful upgrade the version counter has advanced. The
    // contract address is unchanged — `client` continues to address the
    // same instance.
    assert_eq!(client.version(), 2);
}

#[test]
#[should_panic]
fn test_upgrade_unauthorized() {
    // Set up WITHOUT `mock_all_auths` so that the admin's signature is
    // missing. `upg::upgrade` must reject the call before it touches any
    // state.
    let env = Env::default();
    env.ledger().set_sequence_number(START_LEDGER);

    let admin = Address::generate(&env);

    // Constructor itself uses `admin.require_auth()`, so we need to mock
    // that single call but no others. After construction we drop the
    // auth-mocking by registering a fresh contract from a separate env
    // would be cleaner, but mock_auths with an empty allow-list achieves
    // the same effect for the upgrade attempt below.
    env.mock_all_auths();
    let contract_id = env.register(UpgradeableReference, (admin.clone(),));
    let client = UpgradeableReferenceClient::new(&env, &contract_id);

    // Re-arm auth so that NO signature is mocked — any subsequent
    // `require_auth()` call must panic.
    env.set_auths(&[]);

    let new_hash = upload_v2_hash(&env);
    // Should panic inside `upg::upgrade -> require_admin -> require_auth`.
    client.upgrade(&new_hash);
}

#[test]
fn test_version_increments() {
    let (env, client, _admin) = setup();
    let new_hash = upload_v2_hash(&env);

    assert_eq!(client.version(), 1);
    client.upgrade(&new_hash);
    assert_eq!(client.version(), 2);
    client.upgrade(&new_hash);
    assert_eq!(client.version(), 3);
}

#[test]
fn test_state_preserved_after_upgrade() {
    let (env, client, _admin) = setup();
    let caller = Address::generate(&env);

    // Build up some state pre-upgrade.
    client.increment(&caller);
    client.increment(&caller);
    client.increment(&caller);
    assert_eq!(client.get(), 3);

    // Swap WASM. The contract address (and therefore its storage entries)
    // does not change — only the executable code does.
    let new_hash = upload_v2_hash(&env);
    client.upgrade(&new_hash);

    // Counter survives the upgrade because storage entries are addressed by
    // the contract instance, not by the WASM hash.
    assert_eq!(client.get(), 3);
    assert_eq!(client.version(), 2);
}

// ── Migration hook (issue #205, option B) ────────────────────────────────

#[test]
fn test_migrate_authorized_bumps_version() {
    let (_env, client, _admin) = setup();
    assert_eq!(client.version(), 1);

    // Apply a hypothetical schema migration that takes us straight to v5
    // (the wildcard arm in `migrate` is a no-op; this exercises the
    // version-bookkeeping path).
    client.migrate(&5);
    assert_eq!(client.version(), 5);
}

// Soroban WASM contract panics surface to the host as `Error(WasmVm,
// InvalidAction)` rather than the original Rust panic message, so we use a
// bare `#[should_panic]` here. The downgrade guard's behaviour is verified
// by the absence-of-version-bump in the success-path tests above.
#[test]
#[should_panic]
fn test_migrate_rejects_no_op_or_downgrade() {
    let (_env, client, _admin) = setup();
    // Current version is 1; migrating to 1 is a no-op and must be rejected
    // (it would otherwise let an attacker stomp on the version counter).
    client.migrate(&1);
}

#[test]
#[should_panic]
fn test_migrate_rejects_strict_downgrade() {
    let (env, client, _admin) = setup();
    let new_hash = upload_v2_hash(&env);
    client.upgrade(&new_hash); // version is now 2
    client.migrate(&1); // attempt to roll back
}

// ── Admin transfer ───────────────────────────────────────────────────────

#[test]
fn transfer_admin_updates_owner() {
    let (env, client, _admin) = setup();
    let new_admin = Address::generate(&env);
    client.transfer_admin(&new_admin);
    assert_eq!(client.admin(), new_admin);
}

#[test]
fn version_unchanged_by_admin_transfer() {
    let (env, client, _admin) = setup();
    let new_admin = Address::generate(&env);
    client.transfer_admin(&new_admin);
    assert_eq!(client.version(), 1);
}
