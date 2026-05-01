#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _, Ledger},
    Env,
};

// Minimal mock token — just tracks balances
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

fn setup() -> (Env, VestingClient<'static>, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let contract_id = env.register(Vesting, ());
    let client = VestingClient::new(&env, &contract_id);
    client.initialize(&admin);

    let token_id = env.register(MockToken, ());
    let funder = Address::generate(&env);
    MockTokenClient::new(&env, &token_id).mint(&funder, &1_000_000);

    (env, client, admin, funder, token_id)
}

#[test]
fn test_full_vest_after_duration() {
    let (env, client, _admin, funder, token) = setup();
    let beneficiary = Address::generate(&env);

    let now = env.ledger().timestamp();
    let id = client.create_schedule(
        &funder,
        &beneficiary,
        &token,
        &100_000,
        &now,
        &500,
        &1000,
        &false,
    );

    assert_eq!(client.releasable(&id), 0);

    env.ledger().with_mut(|l| l.timestamp = now + 1000);
    assert_eq!(client.releasable(&id), 100_000);

    let released = client.release(&id);
    assert_eq!(released, 100_000);
    assert_eq!(MockTokenClient::new(&env, &token).balance(&beneficiary), 100_000);
}

#[test]
fn test_cliff_blocks_early_release() {
    let (env, client, _admin, funder, token) = setup();
    let beneficiary = Address::generate(&env);

    let now = env.ledger().timestamp();
    let id = client.create_schedule(
        &funder,
        &beneficiary,
        &token,
        &100_000,
        &now,
        &500,
        &1000,
        &false,
    );

    env.ledger().with_mut(|l| l.timestamp = now + 499);
    let result = client.try_release(&id);
    assert!(result.is_err());
}

#[test]
fn test_linear_release_midway() {
    let (env, client, _admin, funder, token) = setup();
    let beneficiary = Address::generate(&env);

    let now = env.ledger().timestamp();
    let id = client.create_schedule(
        &funder,
        &beneficiary,
        &token,
        &100_000,
        &now,
        &0,
        &1000,
        &false,
    );

    env.ledger().with_mut(|l| l.timestamp = now + 500);
    assert_eq!(client.releasable(&id), 50_000);

    client.release(&id);

    env.ledger().with_mut(|l| l.timestamp = now + 750);
    assert_eq!(client.releasable(&id), 25_000);
}

#[test]
fn test_revoke_splits_correctly() {
    let (env, client, admin, funder, token) = setup();
    let beneficiary = Address::generate(&env);

    let now = env.ledger().timestamp();
    let id = client.create_schedule(
        &funder,
        &beneficiary,
        &token,
        &100_000,
        &now,
        &0,
        &1000,
        &true,
    );

    env.ledger().with_mut(|l| l.timestamp = now + 500);
    client.revoke(&id);

    assert_eq!(MockTokenClient::new(&env, &token).balance(&beneficiary), 50_000);
    assert_eq!(MockTokenClient::new(&env, &token).balance(&admin), 50_000);
}
