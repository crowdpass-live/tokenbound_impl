#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl,
    testutils::Address as _,
    vec, Env,
};

// ── Minimal mock token ────────────────────────────────────────────────────────

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        let from_bal: i128 = env.storage().instance().get(&from).unwrap_or(0);
        let to_bal: i128 = env.storage().instance().get(&to).unwrap_or(0);
        env.storage().instance().set(&from, &(from_bal - amount));
        env.storage().instance().set(&to, &(to_bal + amount));
    }

    pub fn balance(env: Env, addr: Address) -> i128 {
        env.storage().instance().get(&addr).unwrap_or(0)
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let bal: i128 = env.storage().instance().get(&to).unwrap_or(0);
        env.storage().instance().set(&to, &(bal + amount));
    }
}

// ── Test helpers ──────────────────────────────────────────────────────────────

struct Setup {
    env: Env,
    client: EscrowContractClient<'static>,
    token: Address,
    depositor: Address,
    recipient: Address,
    arbiter: Address,
}

fn setup() -> Setup {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(EscrowContract, ());
    let client = EscrowContractClient::new(&env, &contract_id);
    client.initialize(&admin);

    let token = env.register(MockToken, ());
    let depositor = Address::generate(&env);
    MockTokenClient::new(&env, &token).mint(&depositor, &1_000_000);

    Setup {
        env,
        client,
        token,
        depositor,
        recipient: Address::generate(&env),
        arbiter: Address::generate(&env),
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn test_create_escrow_transfers_funds() {
    let s = setup();
    let amounts = vec![&s.env, 300_i128, 700_i128];

    let id = s.client.create_escrow(
        &s.depositor,
        &s.recipient,
        &s.arbiter,
        &s.token,
        &amounts,
    );

    let escrow = s.client.get_escrow(&id).unwrap();
    assert_eq!(escrow.total_amount, 1_000);
    assert_eq!(escrow.released, 0);
    assert!(matches!(escrow.status, EscrowStatus::Active));
    // Depositor balance reduced
    assert_eq!(
        MockTokenClient::new(&s.env, &s.token).balance(&s.depositor),
        999_000
    );
}

#[test]
fn test_approve_milestone_releases_funds() {
    let s = setup();
    let amounts = vec![&s.env, 400_i128, 600_i128];
    let id = s.client.create_escrow(
        &s.depositor, &s.recipient, &s.arbiter, &s.token, &amounts,
    );

    let released = s.client.approve_milestone(&id, &0);
    assert_eq!(released, 400);
    assert_eq!(
        MockTokenClient::new(&s.env, &s.token).balance(&s.recipient),
        400
    );

    let escrow = s.client.get_escrow(&id).unwrap();
    assert_eq!(escrow.released, 400);
    assert!(matches!(escrow.status, EscrowStatus::Active));
}

#[test]
fn test_all_milestones_approved_closes_escrow() {
    let s = setup();
    let amounts = vec![&s.env, 500_i128, 500_i128];
    let id = s.client.create_escrow(
        &s.depositor, &s.recipient, &s.arbiter, &s.token, &amounts,
    );

    s.client.approve_milestone(&id, &0);
    s.client.approve_milestone(&id, &1);

    let escrow = s.client.get_escrow(&id).unwrap();
    assert!(matches!(escrow.status, EscrowStatus::Closed));
    assert_eq!(
        MockTokenClient::new(&s.env, &s.token).balance(&s.recipient),
        1_000
    );
}

#[test]
fn test_double_approve_fails() {
    let s = setup();
    let amounts = vec![&s.env, 1_000_i128];
    let id = s.client.create_escrow(
        &s.depositor, &s.recipient, &s.arbiter, &s.token, &amounts,
    );

    s.client.approve_milestone(&id, &0);
    let result = s.client.try_approve_milestone(&id, &0);
    assert!(result.is_err());
}

#[test]
fn test_open_dispute_blocks_approval() {
    let s = setup();
    let amounts = vec![&s.env, 1_000_i128];
    let id = s.client.create_escrow(
        &s.depositor, &s.recipient, &s.arbiter, &s.token, &amounts,
    );

    s.client.open_dispute(&id, &s.depositor);

    let result = s.client.try_approve_milestone(&id, &0);
    assert!(result.is_err());
}

#[test]
fn test_resolve_dispute_splits_remaining() {
    let s = setup();
    // Two milestones: first already approved, second disputed.
    let amounts = vec![&s.env, 400_i128, 600_i128];
    let id = s.client.create_escrow(
        &s.depositor, &s.recipient, &s.arbiter, &s.token, &amounts,
    );

    s.client.approve_milestone(&id, &0); // releases 400
    s.client.open_dispute(&id, &s.recipient);

    // Arbiter gives 300 of the remaining 600 to recipient, 300 back to depositor.
    s.client.resolve_dispute(&id, &300);

    assert_eq!(
        MockTokenClient::new(&s.env, &s.token).balance(&s.recipient),
        700  // 400 + 300
    );
    assert_eq!(
        MockTokenClient::new(&s.env, &s.token).balance(&s.depositor),
        999_300  // 1_000_000 - 1_000 deposited + 300 returned
    );

    let escrow = s.client.get_escrow(&id).unwrap();
    assert!(matches!(escrow.status, EscrowStatus::Closed));
}

#[test]
fn test_resolve_dispute_requires_open_dispute() {
    let s = setup();
    let amounts = vec![&s.env, 1_000_i128];
    let id = s.client.create_escrow(
        &s.depositor, &s.recipient, &s.arbiter, &s.token, &amounts,
    );

    let result = s.client.try_resolve_dispute(&id, &500);
    assert!(result.is_err());
}

#[test]
fn test_invalid_recipient_share_rejected() {
    let s = setup();
    let amounts = vec![&s.env, 1_000_i128];
    let id = s.client.create_escrow(
        &s.depositor, &s.recipient, &s.arbiter, &s.token, &amounts,
    );

    s.client.open_dispute(&id, &s.depositor);

    // Share exceeds remaining balance.
    let result = s.client.try_resolve_dispute(&id, &1_001);
    assert!(result.is_err());
}
