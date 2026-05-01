#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, DeployerRegistryClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let contract_id = env.register(DeployerRegistry, (admin.clone(),));
    let client = DeployerRegistryClient::new(&env, &contract_id);
    (env, client, admin)
}

// ── Initialisation ───────────────────────────────────────────────────────────

#[test]
fn test_initial_state() {
    let (_env, client, admin) = setup();
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_pending_admin(), None);
}

#[test]
fn test_constructor_runs_once() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    // Soroban registers a constructor every call; double-init guard lives
    // inside the constructor itself. Simulate the second call by invoking
    // the constructor's logic via a fresh registration with the same env
    // and admin — which Soroban's `env.register` does NOT re-run, so we
    // construct a tiny shim by manually invoking the entry point twice.
    let id = env.register(DeployerRegistry, (admin.clone(),));
    // Re-invoke the constructor to confirm the guard fires and returns Err.
    env.as_contract(&id, || {
        let res = DeployerRegistry::__constructor(env.clone(), admin.clone());
        assert_eq!(res, Err(Error::AlreadyInitialized));
    });
}

// ── Allowlist management (covers the four `test_*` cases from the issue) ─────

#[test]
fn test_admin_can_add_deployer() {
    let (env, client, admin) = setup();
    let deployer = Address::generate(&env);

    client.add_deployer(&admin, &deployer);

    assert!(client.is_authorized(&deployer));
    assert_eq!(client.role_of(&deployer), Role::Deployer);
}

#[test]
fn test_unauthorized_cannot_add_deployer() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let imposter = Address::generate(&env);
    let target = Address::generate(&env);

    let id = env.register(DeployerRegistry, (admin.clone(),));
    let client = DeployerRegistryClient::new(&env, &id);

    // `imposter` signs the transaction (mock_all_auths means require_auth
    // succeeds for any caller) but is not the stored admin, so the
    // explicit equality check inside `require_stored_admin` rejects it.
    let res = client.try_add_deployer(&imposter, &target);
    assert_eq!(res, Err(Ok(Error::Unauthorized)));
    assert!(!client.is_authorized(&target));
}

#[test]
fn test_authorized_deployer_can_deploy() {
    // The registry exposes `is_authorized(addr) -> bool` which
    // `ticket_factory::deploy_ticket` consults before invoking
    // `env.deployer()`. This test verifies the contract-level invariant
    // (allowlisted addresses report as authorized); the factory↔registry
    // integration is exercised as a workspace integration test elsewhere
    // once the ticket_nft WASM build is available on the test machine.
    let (env, client, admin) = setup();
    let deployer = Address::generate(&env);

    client.add_deployer(&admin, &deployer);

    assert!(
        client.is_authorized(&deployer),
        "an explicitly-allowlisted address must be authorized"
    );
}

#[test]
fn test_unauthorized_deployer_blocked() {
    let (env, client, _admin) = setup();
    let stranger = Address::generate(&env);

    assert!(
        !client.is_authorized(&stranger),
        "an address that was never added must not be authorized"
    );
    assert_eq!(client.role_of(&stranger), Role::Operator);
}

// ── Two-step admin transfer ──────────────────────────────────────────────────

#[test]
fn test_admin_transfer_two_step() {
    let (env, client, admin) = setup();
    let new_admin = Address::generate(&env);

    // Step 1: propose. Admin pointer must NOT change yet.
    client.propose_admin(&admin, &new_admin);
    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_pending_admin(), Some(new_admin.clone()));

    // Step 2: accept. Admin pointer flips, pending slot is cleared.
    client.accept_admin(&new_admin);
    assert_eq!(client.get_admin(), new_admin);
    assert_eq!(client.get_pending_admin(), None);

    // The new admin is now classified as Admin; the old admin reverts to
    // Operator (no allowlist membership).
    assert_eq!(client.role_of(&new_admin), Role::Admin);
    assert_eq!(client.role_of(&admin), Role::Operator);
}

#[test]
fn test_pending_admin_can_be_overwritten() {
    let (env, client, admin) = setup();
    let first = Address::generate(&env);
    let second = Address::generate(&env);

    client.propose_admin(&admin, &first);
    client.propose_admin(&admin, &second);

    // Only the most recent proposal is honored — the first proposal can
    // no longer accept.
    let bad = client.try_accept_admin(&first);
    assert_eq!(bad, Err(Ok(Error::NoPendingAdmin)));

    client.accept_admin(&second);
    assert_eq!(client.get_admin(), second);
}

#[test]
fn test_accept_admin_without_pending_fails() {
    let (env, client, _admin) = setup();
    let stranger = Address::generate(&env);
    let res = client.try_accept_admin(&stranger);
    assert_eq!(res, Err(Ok(Error::NoPendingAdmin)));
}

#[test]
fn test_accept_admin_rejects_wrong_caller() {
    let (env, client, admin) = setup();
    let proposed = Address::generate(&env);
    let stranger = Address::generate(&env);

    client.propose_admin(&admin, &proposed);
    let res = client.try_accept_admin(&stranger);
    assert_eq!(res, Err(Ok(Error::NoPendingAdmin)));
    // Original admin is still in charge until the proposed address accepts.
    assert_eq!(client.get_admin(), admin);
}

// ── Removal & idempotency ────────────────────────────────────────────────────

#[test]
fn test_deployer_removal_revokes_access() {
    let (env, client, admin) = setup();
    let deployer = Address::generate(&env);

    client.add_deployer(&admin, &deployer);
    assert!(client.is_authorized(&deployer));

    client.remove_deployer(&admin, &deployer);
    assert!(!client.is_authorized(&deployer));
    assert_eq!(client.role_of(&deployer), Role::Operator);
}

#[test]
fn test_add_deployer_is_idempotent_with_typed_error() {
    let (env, client, admin) = setup();
    let deployer = Address::generate(&env);

    client.add_deployer(&admin, &deployer);
    let again = client.try_add_deployer(&admin, &deployer);
    assert_eq!(again, Err(Ok(Error::DeployerAlreadyExists)));
    assert!(client.is_authorized(&deployer));
}

#[test]
fn test_remove_unknown_deployer_returns_typed_error() {
    let (env, client, admin) = setup();
    let stranger = Address::generate(&env);
    let res = client.try_remove_deployer(&admin, &stranger);
    assert_eq!(res, Err(Ok(Error::DeployerNotFound)));
}

// ── Admin role classification ────────────────────────────────────────────────

#[test]
fn test_admin_is_implicitly_authorized() {
    let (_env, client, admin) = setup();
    // Admin should be reported as authorized even without being added to
    // the allowlist explicitly.
    assert!(client.is_authorized(&admin));
    assert_eq!(client.role_of(&admin), Role::Admin);
}

#[test]
fn test_role_of_classifies_correctly() {
    let (env, client, admin) = setup();
    let allowlisted = Address::generate(&env);
    let stranger = Address::generate(&env);

    client.add_deployer(&admin, &allowlisted);

    assert_eq!(client.role_of(&admin), Role::Admin);
    assert_eq!(client.role_of(&allowlisted), Role::Deployer);
    assert_eq!(client.role_of(&stranger), Role::Operator);
}
