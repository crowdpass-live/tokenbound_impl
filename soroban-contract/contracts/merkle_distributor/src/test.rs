#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Bytes, BytesN, Env, Vec,
};

// ── Merkle tree helpers (mirrors the contract's algorithm) ────────────────────

/// Build the same leaf the contract would compute.
fn make_leaf(env: &Env, claimant: &Address, amount: i128) -> BytesN<32> {
    let addr_str = claimant.to_string();
    let mut addr_raw = Bytes::new(env);
    let str_len = addr_str.len();
    let mut buf = [0u8; 64];
    let copy_len = if str_len <= 64 { str_len } else { 64 };
    addr_str.copy_into_slice(&mut buf[..copy_len as usize]);
    addr_raw.append(&Bytes::from_slice(env, &buf[..copy_len as usize]));
    let addr_hash: BytesN<32> = env.crypto().sha256(&addr_raw).into();

    let amount_u64 = amount as u64;
    let amt_buf: [u8; 8] = [
        (amount_u64 & 0xff) as u8,
        ((amount_u64 >> 8) & 0xff) as u8,
        ((amount_u64 >> 16) & 0xff) as u8,
        ((amount_u64 >> 24) & 0xff) as u8,
        ((amount_u64 >> 32) & 0xff) as u8,
        ((amount_u64 >> 40) & 0xff) as u8,
        ((amount_u64 >> 48) & 0xff) as u8,
        ((amount_u64 >> 56) & 0xff) as u8,
    ];

    let mut preimage = Bytes::new(env);
    preimage.append(&Bytes::from_slice(env, &addr_hash.to_array()));
    preimage.append(&Bytes::from_slice(env, &amt_buf));
    env.crypto().sha256(&preimage).into()
}

/// Sorted-pair hash (mirrors `hash_pair` in the contract).
fn hash_pair(env: &Env, a: &BytesN<32>, b: &BytesN<32>) -> BytesN<32> {
    let a_arr = a.to_array();
    let b_arr = b.to_array();

    let mut a_le_b = true;
    for i in 0..32usize {
        if a_arr[i] < b_arr[i] {
            a_le_b = true;
            break;
        } else if a_arr[i] > b_arr[i] {
            a_le_b = false;
            break;
        }
    }

    let mut combined = Bytes::new(env);
    if a_le_b {
        combined.append(&Bytes::from_slice(env, &a_arr));
        combined.append(&Bytes::from_slice(env, &b_arr));
    } else {
        combined.append(&Bytes::from_slice(env, &b_arr));
        combined.append(&Bytes::from_slice(env, &a_arr));
    }
    env.crypto().sha256(&combined).into()
}

/// Build a 2-leaf Merkle tree; return (root, proof_for_leaf_0, proof_for_leaf_1).
fn two_leaf_tree(
    env: &Env,
    leaf0: &BytesN<32>,
    leaf1: &BytesN<32>,
) -> (BytesN<32>, Vec<BytesN<32>>, Vec<BytesN<32>>) {
    let root = hash_pair(env, leaf0, leaf1);

    let mut proof0: Vec<BytesN<32>> = Vec::new(env);
    proof0.push_back(leaf1.clone());

    let mut proof1: Vec<BytesN<32>> = Vec::new(env);
    proof1.push_back(leaf0.clone());

    (root, proof0, proof1)
}

/// Build a 4-leaf Merkle tree; return (root, proof_for_index).
fn four_leaf_tree(
    env: &Env,
    leaves: &[BytesN<32>; 4],
) -> (BytesN<32>, [Vec<BytesN<32>>; 4]) {
    // Level 1
    let h01 = hash_pair(env, &leaves[0], &leaves[1]);
    let h23 = hash_pair(env, &leaves[2], &leaves[3]);
    // Root
    let root = hash_pair(env, &h01, &h23);

    let mut p0: Vec<BytesN<32>> = Vec::new(env);
    p0.push_back(leaves[1].clone());
    p0.push_back(h23.clone());

    let mut p1: Vec<BytesN<32>> = Vec::new(env);
    p1.push_back(leaves[0].clone());
    p1.push_back(h23.clone());

    let mut p2: Vec<BytesN<32>> = Vec::new(env);
    p2.push_back(leaves[3].clone());
    p2.push_back(h01.clone());

    let mut p3: Vec<BytesN<32>> = Vec::new(env);
    p3.push_back(leaves[2].clone());
    p3.push_back(h01.clone());

    (root, [p0, p1, p2, p3])
}

// ── Test helpers ──────────────────────────────────────────────────────────────

fn create_token<'a>(env: &Env, admin: &Address) -> (TokenClient<'a>, StellarAssetClient<'a>) {
    let id = env.register_stellar_asset_contract_v2(admin.clone());
    (
        TokenClient::new(env, &id.address()),
        StellarAssetClient::new(env, &id.address()),
    )
}

fn deploy(env: &Env) -> (MerkleDistributorClient<'_>, Address) {
    let id = env.register(MerkleDistributor, ());
    let client = MerkleDistributorClient::new(env, &id);
    (client, id)
}

// ── Initialization tests ──────────────────────────────────────────────────────

#[test]
fn test_initialize_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (client, _) = deploy(&env);
    let (token, _sac) = create_token(&env, &admin);

    let root = BytesN::from_array(&env, &[1u8; 32]);
    client.initialize(&admin, &token.address, &root, &0u64);

    assert_eq!(client.merkle_root(), root);
    assert_eq!(client.token(), token.address);
    assert_eq!(client.expiry(), 0u64);
}

#[test]
fn test_initialize_twice_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (client, _) = deploy(&env);
    let (token, _sac) = create_token(&env, &admin);
    let root = BytesN::from_array(&env, &[1u8; 32]);

    client.initialize(&admin, &token.address, &root, &0u64);
    let result = client.try_initialize(&admin, &token.address, &root, &0u64);
    assert_eq!(result.unwrap_err().unwrap(), Error::AlreadyInitialized);
}

// ── Single-leaf claim ─────────────────────────────────────────────────────────

#[test]
fn test_claim_single_leaf_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let amount: i128 = 1_000;

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    // Single-leaf tree: root == leaf
    let leaf = make_leaf(&env, &alice, amount);
    let empty_proof: Vec<BytesN<32>> = Vec::new(&env);

    client.initialize(&admin, &token.address, &leaf, &0u64);

    // Fund the contract
    sac.mint(&contract_addr, &amount);

    client.claim(&0u64, &alice, &amount, &empty_proof);

    assert_eq!(token.balance(&alice), amount);
    assert_eq!(token.balance(&contract_addr), 0);
    assert!(client.is_claimed(&0u64));
}

#[test]
fn test_claim_double_claim_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let amount: i128 = 500;

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let leaf = make_leaf(&env, &alice, amount);
    let empty_proof: Vec<BytesN<32>> = Vec::new(&env);

    client.initialize(&admin, &token.address, &leaf, &0u64);
    sac.mint(&contract_addr, &(amount * 2)); // enough for two, but should reject

    client.claim(&0u64, &alice, &amount, &empty_proof);

    let result = client.try_claim(&0u64, &alice, &amount, &empty_proof);
    assert_eq!(result.unwrap_err().unwrap(), Error::AlreadyClaimed);
}

#[test]
fn test_claim_invalid_proof_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let amount: i128 = 1_000;

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let leaf = make_leaf(&env, &alice, amount);
    client.initialize(&admin, &token.address, &leaf, &0u64);
    sac.mint(&contract_addr, &amount);

    // Wrong amount in the claim
    let bad_amount: i128 = 999;
    let empty_proof: Vec<BytesN<32>> = Vec::new(&env);
    let result = client.try_claim(&0u64, &alice, &bad_amount, &empty_proof);
    assert_eq!(result.unwrap_err().unwrap(), Error::InvalidProof);
}

// ── Two-leaf Merkle tree ──────────────────────────────────────────────────────

#[test]
fn test_claim_two_leaf_tree_both_recipients() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let amount_a: i128 = 600;
    let amount_b: i128 = 400;

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let leaf_a = make_leaf(&env, &alice, amount_a);
    let leaf_b = make_leaf(&env, &bob, amount_b);
    let (root, proof_a, proof_b) = two_leaf_tree(&env, &leaf_a, &leaf_b);

    client.initialize(&admin, &token.address, &root, &0u64);
    sac.mint(&contract_addr, &(amount_a + amount_b));

    client.claim(&0u64, &alice, &amount_a, &proof_a);
    client.claim(&1u64, &bob, &amount_b, &proof_b);

    assert_eq!(token.balance(&alice), amount_a);
    assert_eq!(token.balance(&bob), amount_b);
    assert_eq!(token.balance(&contract_addr), 0);
    assert!(client.is_claimed(&0u64));
    assert!(client.is_claimed(&1u64));
}

#[test]
fn test_claim_two_leaf_wrong_index_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let amount_a: i128 = 600;
    let amount_b: i128 = 400;

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let leaf_a = make_leaf(&env, &alice, amount_a);
    let leaf_b = make_leaf(&env, &bob, amount_b);
    let (root, proof_a, _proof_b) = two_leaf_tree(&env, &leaf_a, &leaf_b);

    client.initialize(&admin, &token.address, &root, &0u64);
    sac.mint(&contract_addr, &(amount_a + amount_b));

    // Bob tries to use Alice's proof — should fail as leaf won't match
    let result = client.try_claim(&0u64, &bob, &amount_b, &proof_a);
    assert_eq!(result.unwrap_err().unwrap(), Error::InvalidProof);
}

// ── Four-leaf Merkle tree ─────────────────────────────────────────────────────

#[test]
fn test_claim_four_leaf_tree_all_recipients() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let users: [Address; 4] = [
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
        Address::generate(&env),
    ];
    let amounts: [i128; 4] = [250, 300, 200, 250];

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let leaves: [BytesN<32>; 4] = [
        make_leaf(&env, &users[0], amounts[0]),
        make_leaf(&env, &users[1], amounts[1]),
        make_leaf(&env, &users[2], amounts[2]),
        make_leaf(&env, &users[3], amounts[3]),
    ];

    let (root, proofs) = four_leaf_tree(&env, &leaves);
    let total: i128 = amounts.iter().sum();

    client.initialize(&admin, &token.address, &root, &0u64);
    sac.mint(&contract_addr, &total);

    for i in 0u64..4u64 {
        client.claim(&i, &users[i as usize], &amounts[i as usize], &proofs[i as usize]);
        assert_eq!(token.balance(&users[i as usize]), amounts[i as usize]);
        assert!(client.is_claimed(&i));
    }

    assert_eq!(token.balance(&contract_addr), 0);
}

// ── Expiry tests ──────────────────────────────────────────────────────────────

#[test]
fn test_claim_before_expiry_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let amount: i128 = 1_000;

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let leaf = make_leaf(&env, &alice, amount);
    let empty_proof: Vec<BytesN<32>> = Vec::new(&env);

    // Set expiry 1000 seconds in the future
    let now = env.ledger().timestamp();
    let expiry = now + 1_000;

    client.initialize(&admin, &token.address, &leaf, &expiry);
    sac.mint(&contract_addr, &amount);

    client.claim(&0u64, &alice, &amount, &empty_proof);
    assert_eq!(token.balance(&alice), amount);
}

#[test]
fn test_claim_after_expiry_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let amount: i128 = 1_000;

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let leaf = make_leaf(&env, &alice, amount);
    let empty_proof: Vec<BytesN<32>> = Vec::new(&env);

    let now = env.ledger().timestamp();
    let expiry = now + 100;

    client.initialize(&admin, &token.address, &leaf, &expiry);
    sac.mint(&contract_addr, &amount);

    // Advance ledger past expiry
    env.ledger().set_timestamp(expiry + 1);

    let result = client.try_claim(&0u64, &alice, &amount, &empty_proof);
    assert_eq!(result.unwrap_err().unwrap(), Error::AirdropExpired);
}

// ── Sweep tests ───────────────────────────────────────────────────────────────

#[test]
fn test_sweep_after_expiry_succeeds() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let amount: i128 = 5_000;

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let root = BytesN::from_array(&env, &[0u8; 32]);
    let now = env.ledger().timestamp();
    let expiry = now + 500;

    client.initialize(&admin, &token.address, &root, &expiry);
    sac.mint(&contract_addr, &amount);

    // Advance past expiry
    env.ledger().set_timestamp(expiry + 1);

    let swept = client.sweep(&treasury);
    assert_eq!(swept, amount);
    assert_eq!(token.balance(&treasury), amount);
    assert_eq!(token.balance(&contract_addr), 0);
}

#[test]
fn test_sweep_before_expiry_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let root = BytesN::from_array(&env, &[0u8; 32]);
    let now = env.ledger().timestamp();
    let expiry = now + 1_000;

    client.initialize(&admin, &token.address, &root, &expiry);
    sac.mint(&contract_addr, &1_000);

    let result = client.try_sweep(&treasury);
    assert_eq!(result.unwrap_err().unwrap(), Error::NotExpired);
}

#[test]
fn test_sweep_no_expiry_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let root = BytesN::from_array(&env, &[0u8; 32]);
    client.initialize(&admin, &token.address, &root, &0u64); // no expiry
    sac.mint(&contract_addr, &1_000);

    let result = client.try_sweep(&treasury);
    assert_eq!(result.unwrap_err().unwrap(), Error::NotExpired);
}

// ── Fund test ─────────────────────────────────────────────────────────────────

#[test]
fn test_fund_increases_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let funder = Address::generate(&env);

    let (client, contract_addr) = deploy(&env);
    let (token, sac) = create_token(&env, &admin);

    let root = BytesN::from_array(&env, &[1u8; 32]);
    client.initialize(&admin, &token.address, &root, &0u64);

    sac.mint(&funder, &2_000);
    client.fund(&funder, &2_000);

    assert_eq!(client.balance(), 2_000);
    assert_eq!(token.balance(&contract_addr), 2_000);
}

// ── Insufficient balance test ─────────────────────────────────────────────────

#[test]
fn test_claim_insufficient_balance_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let amount: i128 = 1_000;

    let (client, _) = deploy(&env);
    let (token, _sac) = create_token(&env, &admin);

    let leaf = make_leaf(&env, &alice, amount);
    let empty_proof: Vec<BytesN<32>> = Vec::new(&env);

    client.initialize(&admin, &token.address, &leaf, &0u64);
    // Do NOT fund the contract

    let result = client.try_claim(&0u64, &alice, &amount, &empty_proof);
    assert_eq!(result.unwrap_err().unwrap(), Error::InsufficientBalance);
}

// ── set_expiry test ───────────────────────────────────────────────────────────

#[test]
fn test_set_expiry_updates_correctly() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (client, _) = deploy(&env);
    let (token, _) = create_token(&env, &admin);

    let root = BytesN::from_array(&env, &[1u8; 32]);
    client.initialize(&admin, &token.address, &root, &0u64);

    assert_eq!(client.expiry(), 0u64);

    client.set_expiry(&9999u64);
    assert_eq!(client.expiry(), 9999u64);
}

// ── is_claimed default false ──────────────────────────────────────────────────

#[test]
fn test_is_claimed_default_false() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (client, _) = deploy(&env);
    let (token, _) = create_token(&env, &admin);

    let root = BytesN::from_array(&env, &[1u8; 32]);
    client.initialize(&admin, &token.address, &root, &0u64);

    assert!(!client.is_claimed(&42u64));
    assert!(!client.is_claimed(&0u64));
}
