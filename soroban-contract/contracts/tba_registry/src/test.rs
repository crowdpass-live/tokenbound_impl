#![cfg(test)]
extern crate alloc;
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

mod tba_account_contract {
    use soroban_sdk::auth::Context;
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/tba_account.wasm"
    );
}

#[contract]
pub struct MockNFT;

#[contractimpl]
impl MockNFT {
    pub fn owner_of(_env: Env, _token_id: u128) -> Address {
        Address::generate(&_env)
    }
}

fn setup_test() -> (Env, TbaRegistryClient<'static>, BytesN<32>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let wasm_hash = env
        .deployer()
        .upload_contract_wasm(tba_account_contract::WASM);
    let registry_address = env.register(TbaRegistry, (&admin, &wasm_hash));
    let client = TbaRegistryClient::new(&env, &registry_address);
    let nft_address = env.register(MockNFT, ());
    (env, client, wasm_hash, nft_address)
}

#[test]
fn test_create_account_authorized() {
    let (env, client, _wasm_hash, nft_addr) = setup_test();
    let token_id = 1u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    let deployed = client.create_account(&impl_hash, &nft_addr, &token_id, &salt);
    let tba = tba_account_contract::Client::new(&env, &deployed);
    assert_eq!(tba.token_contract(), nft_addr);
    assert_eq!(tba.token_id(), token_id);
}

#[test]
fn test_get_account_matches_create_account() {
    let (env, client, _wasm_hash, nft_addr) = setup_test();
    let token_id = 1u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    let calculated = client.get_account(&impl_hash, &nft_addr, &token_id, &salt);
    let deployed = client.create_account(&impl_hash, &nft_addr, &token_id, &salt);
    assert_eq!(calculated, deployed);
}

#[test]
fn test_multiple_accounts_same_nft() {
    let (env, client, _wasm_hash, nft_addr) = setup_test();
    let token_id = 42u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);

    let addr1 = client.create_account(
        &impl_hash,
        &nft_addr,
        &token_id,
        &BytesN::from_array(&env, &[10u8; 32]),
    );
    let addr2 = client.create_account(
        &impl_hash,
        &nft_addr,
        &token_id,
        &BytesN::from_array(&env, &[20u8; 32]),
    );
    let addr3 = client.create_account(
        &impl_hash,
        &nft_addr,
        &token_id,
        &BytesN::from_array(&env, &[30u8; 32]),
    );

    assert_ne!(addr1, addr2);
    assert_ne!(addr2, addr3);
    assert_ne!(addr1, addr3);
    assert_eq!(client.total_deployed_accounts(&nft_addr, &token_id), 3);
}

#[test]
fn test_deployed_account_initialized() {
    let (env, client, _wasm_hash, nft_addr) = setup_test();
    let token_id = 200u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[50u8; 32]);

    let deployed = client.create_account(&impl_hash, &nft_addr, &token_id, &salt);
    let tba = tba_account_contract::Client::new(&env, &deployed);
    assert_eq!(tba.token_contract(), nft_addr);
    assert_eq!(tba.token_id(), token_id);
}

#[test]
fn test_cannot_create_account_twice() {
    let (env, client, _wasm_hash, nft_addr) = setup_test();
    let token_id = 300u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[60u8; 32]);

    client.create_account(&impl_hash, &nft_addr, &token_id, &salt);
    let result = client.try_create_account(&impl_hash, &nft_addr, &token_id, &salt);
    assert!(result.is_err());
}

#[test]
fn test_get_deployed_address() {
    let (env, client, _wasm_hash, nft_addr) = setup_test();
    let token_id = 400u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[70u8; 32]);

    assert_eq!(
        client.get_deployed_address(&impl_hash, &nft_addr, &token_id, &salt),
        None
    );
    let deployed = client.create_account(&impl_hash, &nft_addr, &token_id, &salt);
    assert_eq!(
        client.get_deployed_address(&impl_hash, &nft_addr, &token_id, &salt),
        Some(deployed)
    );
}

#[test]
fn test_different_nfts_separate_counts() {
    let (env, client, _wasm_hash, _) = setup_test();
    let nft1 = env.register(MockNFT, ());
    let nft2 = env.register(MockNFT, ());
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);

    client.create_account(
        &impl_hash,
        &nft1,
        &1u128,
        &BytesN::from_array(&env, &[80u8; 32]),
    );
    client.create_account(
        &impl_hash,
        &nft2,
        &1u128,
        &BytesN::from_array(&env, &[90u8; 32]),
    );

    assert_eq!(client.total_deployed_accounts(&nft1, &1u128), 1);
    assert_eq!(client.total_deployed_accounts(&nft2, &1u128), 1);

    client.create_account(
        &impl_hash,
        &nft1,
        &1u128,
        &BytesN::from_array(&env, &[100u8; 32]),
    );
    assert_eq!(client.total_deployed_accounts(&nft1, &1u128), 2);
    assert_eq!(client.total_deployed_accounts(&nft2, &1u128), 1);
}
