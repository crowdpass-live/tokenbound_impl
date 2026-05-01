#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, Vec,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Deploy a native Stellar token (the test-only stellar-asset-contract) and
/// mint `amount` stroop to `to`.
fn create_token<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, StellarAssetClient<'a>) {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    let token_client = TokenClient::new(env, &token_id.address());
    let sac_client = StellarAssetClient::new(env, &token_id.address());
    (token_client, sac_client)
}

fn mint(sac: &StellarAssetClient, to: &Address, amount: i128) {
    sac.mint(to, &amount);
}

/// Build a `Vec<Recipient>` from a slice of (address, shares) tuples.
fn make_recipients(env: &Env, pairs: &[(Address, u32)]) -> Vec<Recipient> {
    let mut v: Vec<Recipient> = Vec::new(env);
    for (acc, shares) in pairs {
        v.push_back(Recipient {
            account: acc.clone(),
            shares: *shares,
        });
    }
    v
}

/// Deploy contract, mock all auths, return client + contract address.
fn deploy(env: &Env) -> (PaymentSplitterClient<'_>, Address) {
    let id = env.register(PaymentSplitter, ());
    let client = PaymentSplitterClient::new(env, &id);
    (client, id)
}

// ── Initialization tests ──────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _) = deploy(&env);
    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let recipients = make_recipients(&env, &[(alice.clone(), 60), (bob.clone(), 40)]);
    client.initialize(&admin, &recipients);

    assert_eq!(client.total_shares(), 100u32);
    assert_eq!(client.recipient_count(), 2u32);
    assert_eq!(client.shares(&alice), 60u32);
    assert_eq!(client.shares(&bob), 40u32);
}

#[test]
fn test_initialize_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _) = deploy(&env);
    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let recipients = make_recipients(&env, &[(alice, 100)]);

    client.initialize(&admin, &recipients);

    let result = client.try_initialize(&admin, &recipients);
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::AlreadyInitialized
    );
}

#[test]
fn test_initialize_empty_recipients_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _) = deploy(&env);
    let admin = Address::generate(&env);
    let empty: Vec<Recipient> = Vec::new(&env);

    let result = client.try_initialize(&admin, &empty);
    assert_eq!(result.unwrap_err().unwrap(), Error::NoRecipients);
}

#[test]
fn test_initialize_zero_share_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _) = deploy(&env);
    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let recipients = make_recipients(&env, &[(alice, 0)]);

    let result = client.try_initialize(&admin, &recipients);
    assert_eq!(result.unwrap_err().unwrap(), Error::ZeroShare);
}

#[test]
fn test_initialize_duplicate_recipient_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _) = deploy(&env);
    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let recipients = make_recipients(&env, &[(alice.clone(), 50), (alice.clone(), 50)]);

    let result = client.try_initialize(&admin, &recipients);
    assert_eq!(
        result.unwrap_err().unwrap(),
        Error::DuplicateRecipient
    );
}

#[test]
fn test_initialize_too_many_recipients_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let (client, _) = deploy(&env);
    let admin = Address::generate(&env);

    // Build MAX_RECIPIENTS + 1 unique addresses
    let mut pairs: soroban_sdk::Vec<(Address, u32)> = soroban_sdk::Vec::new(&env);
    for _ in 0..(MAX_RECIPIENTS + 1) {
        pairs.push_back((Address::generate(&env), 1u32));
    }

    let mut v: Vec<Recipient> = Vec::new(&env);
    for i in 0..pairs.len() {
        let (acc, s) = pairs.get(i).unwrap();
        v.push_back(Recipient { account: acc, shares: s });
    }

    let result = client.try_initialize(&admin, &v);
    assert_eq!(result.unwrap_err().unwrap(), Error::TooManyRecipients);
}

// ── Release tests ─────────────────────────────────────────────────────────────

#[test]
fn test_release_equal_shares() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let recipients = make_recipients(&env, &[(alice.clone(), 50), (bob.clone(), 50)]);
    client.initialize(&admin, &recipients);

    // Fund the contract with 1_000 tokens
    mint(&sac, &contract_addr, 1_000);
    assert_eq!(token.balance(&contract_addr), 1_000);

    client.release(&token.address);

    // Each should receive 500
    assert_eq!(token.balance(&alice), 500);
    assert_eq!(token.balance(&bob), 500);
    assert_eq!(token.balance(&contract_addr), 0);
}

#[test]
fn test_release_unequal_shares() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    // 60 / 30 / 10 split
    let recipients = make_recipients(
        &env,
        &[
            (alice.clone(), 60),
            (bob.clone(), 30),
            (carol.clone(), 10),
        ],
    );
    client.initialize(&admin, &recipients);

    mint(&sac, &contract_addr, 1_000);
    client.release(&token.address);

    // alice (first) gets remainder: 1000 - 300 - 100 = 600 ✓
    assert_eq!(token.balance(&alice), 600);
    assert_eq!(token.balance(&bob), 300);
    assert_eq!(token.balance(&carol), 100);
    assert_eq!(token.balance(&contract_addr), 0);
}

#[test]
fn test_release_dust_goes_to_first_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    // 1 / 1 / 1 shares, 100 tokens → 33 each + 1 remainder to alice (first)
    let recipients = make_recipients(
        &env,
        &[
            (alice.clone(), 1),
            (bob.clone(), 1),
            (carol.clone(), 1),
        ],
    );
    client.initialize(&admin, &recipients);

    mint(&sac, &contract_addr, 100);
    client.release(&token.address);

    // bob & carol each get 33 (1/3 of 100 floored)
    // alice gets 100 - 33 - 33 = 34 (absorbs the 1-unit dust)
    assert_eq!(token.balance(&bob), 33);
    assert_eq!(token.balance(&carol), 33);
    assert_eq!(token.balance(&alice), 34);
    assert_eq!(token.balance(&contract_addr), 0);
}

#[test]
fn test_release_nothing_to_release_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);

    let (client, _) = deploy(&env);
    let (token, _sac) = create_token(&env, &admin);

    let recipients = make_recipients(&env, &[(alice, 100)]);
    client.initialize(&admin, &recipients);

    // Contract has 0 balance — release should fail
    let result = client.try_release(&token.address);
    assert_eq!(result.unwrap_err().unwrap(), Error::NothingToRelease);
}

#[test]
fn test_release_single_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let recipients = make_recipients(&env, &[(alice.clone(), 100)]);
    client.initialize(&admin, &recipients);

    mint(&sac, &contract_addr, 5_000);
    client.release(&token.address);

    assert_eq!(token.balance(&alice), 5_000);
    assert_eq!(token.balance(&contract_addr), 0);
}

// ── Recipient management tests ────────────────────────────────────────────────

#[test]
fn test_add_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let (client, _) = deploy(&env);
    let recipients = make_recipients(&env, &[(alice.clone(), 60)]);
    client.initialize(&admin, &recipients);

    client.add_recipient(&bob, &40u32);

    assert_eq!(client.total_shares(), 100u32);
    assert_eq!(client.recipient_count(), 2u32);
    assert_eq!(client.shares(&bob), 40u32);
}

#[test]
fn test_add_duplicate_recipient_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);

    let (client, _) = deploy(&env);
    let recipients = make_recipients(&env, &[(alice.clone(), 60)]);
    client.initialize(&admin, &recipients);

    let result = client.try_add_recipient(&alice, &40u32);
    assert_eq!(result.unwrap_err().unwrap(), Error::DuplicateRecipient);
}

#[test]
fn test_remove_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let (client, _) = deploy(&env);
    let recipients = make_recipients(&env, &[(alice.clone(), 60), (bob.clone(), 40)]);
    client.initialize(&admin, &recipients);

    client.remove_recipient(&bob);

    assert_eq!(client.recipient_count(), 1u32);
    assert_eq!(client.total_shares(), 60u32);
    assert_eq!(client.shares(&alice), 60u32);
}

#[test]
fn test_remove_nonexistent_recipient_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let nobody = Address::generate(&env);

    let (client, _) = deploy(&env);
    let recipients = make_recipients(&env, &[(alice, 100)]);
    client.initialize(&admin, &recipients);

    let result = client.try_remove_recipient(&nobody);
    assert_eq!(result.unwrap_err().unwrap(), Error::RecipientNotFound);
}

#[test]
fn test_update_shares() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let (client, _) = deploy(&env);
    let recipients = make_recipients(&env, &[(alice.clone(), 50), (bob.clone(), 50)]);
    client.initialize(&admin, &recipients);

    client.update_shares(&alice, &70u32);

    assert_eq!(client.shares(&alice), 70u32);
    assert_eq!(client.total_shares(), 120u32); // 70 + 50
}

#[test]
fn test_update_shares_zero_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);

    let (client, _) = deploy(&env);
    let recipients = make_recipients(&env, &[(alice.clone(), 50)]);
    client.initialize(&admin, &recipients);

    let result = client.try_update_shares(&alice, &0u32);
    assert_eq!(result.unwrap_err().unwrap(), Error::ZeroShare);
}

#[test]
fn test_update_shares_nonexistent_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let nobody = Address::generate(&env);

    let (client, _) = deploy(&env);
    let recipients = make_recipients(&env, &[(alice, 50)]);
    client.initialize(&admin, &recipients);

    let result = client.try_update_shares(&nobody, &10u32);
    assert_eq!(result.unwrap_err().unwrap(), Error::RecipientNotFound);
}

// ── End-to-end: manage recipients then release ────────────────────────────────

#[test]
fn test_release_after_recipient_changes() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    // Start with alice (100)
    let recipients = make_recipients(&env, &[(alice.clone(), 100)]);
    client.initialize(&admin, &recipients);

    // Add bob (100) → total 200, each gets 50%
    client.add_recipient(&bob, &100u32);

    // Add carol (200) → total 400: alice 25%, bob 25%, carol 50%
    client.add_recipient(&carol, &200u32);

    // Remove alice
    client.remove_recipient(&alice);
    // Now bob(100) + carol(200) = 300 total; bob 33.3%, carol 66.7%

    mint(&sac, &contract_addr, 300);
    client.release(&token.address);

    // bob receives remainder (first after removal), carol receives 200
    // Iteration: i=1 onwards (carol at some index), then bob gets remainder
    // After swap-remove alice, recipients order: [bob or carol, ...] — depends on impl
    // The key property: sum == 300 and contract balance == 0
    assert_eq!(
        token.balance(&bob) + token.balance(&carol),
        300
    );
    assert_eq!(token.balance(&contract_addr), 0);
}
