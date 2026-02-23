#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _, vec, Address, BytesN, Env, IntoVal, Symbol, TryIntoVal,
};

// Mock NFT contract for testing
#[contract]
pub struct MockNftContract;

#[contractimpl]
impl MockNftContract {
    pub fn owner_of(env: Env, token_id: u128) -> Address {
        let key = Symbol::new(&env, "owner");
        env.storage()
            .persistent()
            .get(&(key, token_id))
            .unwrap_or_else(|| Address::generate(&env))
    }

    pub fn set_owner(env: Env, token_id: u128, owner: Address) {
        let key = Symbol::new(&env, "owner");
        env.storage().persistent().set(&(key, token_id), &owner);
    }
}

// Target contract for execution tests
#[contract]
pub struct TargetContract;

#[contractimpl]
impl TargetContract {
    pub fn test_func(env: Env, value: u32) -> Vec<u32> {
        vec![&env, value + 1]
    }
}

// Helper to create test environment
fn create_test_env() -> (Env, TbaAccountClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(TbaAccount, ());
    let client = TbaAccountClient::new(&env, &contract_id);
    (env, client, contract_id)
}

#[test]
fn test_initialize() {
    let (env, client, _) = create_test_env();

    let nft_contract = Address::generate(&env);
    let token_id: u128 = 1;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    // Initialize should succeed
    client.initialize(&nft_contract, &token_id, &impl_hash, &salt).unwrap();

    // Verify initialization
    assert_eq!(client.token_contract().unwrap(), nft_contract);
    assert_eq!(client.token_id().unwrap(), token_id);
}

#[test]
fn test_initialize_twice_fails() {
    let (env, client, _) = create_test_env();

    let nft_contract = Address::generate(&env);
    let token_id: u128 = 1;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    // First initialization
    client.initialize(&nft_contract, &token_id, &impl_hash, &salt).unwrap();

    // Second initialization should fail
    let result = client.initialize(&nft_contract, &token_id, &impl_hash, &salt);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), Error::AlreadyInitialized);
}

#[test]
fn test_execute_success() {
    let (env, client, _) = create_test_env();

    let nft_contract_id = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract_id);

    let target_id = env.register(TargetContract, ());

    let token_id: u128 = 1;
    let owner = Address::generate(&env);
    nft_client.set_owner(&token_id, &owner);

    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    client.initialize(&nft_contract_id, &token_id, &impl_hash, &salt).unwrap();

    // Execute through TBA
    let func = Symbol::new(&env, "test_func");
    let args = vec![&env, 42u32.into_val(&env)];

    // The account will call owner_of(token_id) on nft_contract_id
    let result = client.execute(&target_id, &func, &args).unwrap();

    // Val doesn't implement PartialEq in some SDK versions, so convert back
    let val: u32 = result.get(0).unwrap().try_into_val(&env).unwrap();
    assert_eq!(val, 43u32);
    assert_eq!(client.nonce(), 1);
}

#[test]
#[should_panic] // Only owner can execute
fn test_execute_non_owner_fails() {
    let env = Env::default();

    let contract_id = env.register(TbaAccount, ());
    let client = TbaAccountClient::new(&env, &contract_id);

    let nft_contract_id = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract_id);

    let token_id: u128 = 1;
    let owner = Address::generate(&env);
    nft_client.set_owner(&token_id, &owner);

    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);
    client.initialize(&nft_contract_id, &token_id, &impl_hash, &salt).unwrap();

    let target = Address::generate(&env);
    let func = Symbol::new(&env, "test");

    // Auth is NOT mocked, so it will fail when it hits owner.require_auth()
    let _ = client.execute(&target, &func, &vec![&env]);
