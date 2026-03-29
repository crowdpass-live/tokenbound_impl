use super::*;
use soroban_sdk::{
    testutils::Address as _, vec, Address, BytesN, Env, IntoVal, Symbol, TryIntoVal, Vec,
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

    client.initialize(&nft_contract, &token_id, &impl_hash, &salt);

    assert_eq!(client.token_contract(), nft_contract);
    assert_eq!(client.token_id(), token_id);
}

#[test]
fn test_initialize_twice_fails() {
    let (env, client, _) = create_test_env();

    let nft_contract = Address::generate(&env);
    let token_id: u128 = 1;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    client.initialize(&nft_contract, &token_id, &impl_hash, &salt);

    let result = client.try_initialize(&nft_contract, &token_id, &impl_hash, &salt);
    assert!(result.is_err());
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

    client.initialize(&nft_contract_id, &token_id, &impl_hash, &salt);

    let func = Symbol::new(&env, "test_func");
    let args = vec![&env, 42u32.into_val(&env)];

    let result = client.execute(&target_id, &func, &args);

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
    client.initialize(&nft_contract_id, &token_id, &impl_hash, &salt);

    let target = Address::generate(&env);
    let func = Symbol::new(&env, "test");

    client.execute(&target, &func, &vec![&env]);
}

#[test]
fn test_large_token_id_success() {
    let (env, client, _) = create_test_env();

    let nft_contract_id = env.register(MockNftContract, ());
    let nft_client = MockNftContractClient::new(&env, &nft_contract_id);

    let target_id = env.register(TargetContract, ());

    let token_id: u128 = 18446744073709551616;
    let owner = Address::generate(&env);
    nft_client.set_owner(&token_id, &owner);

    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    client.initialize(&nft_contract_id, &token_id, &impl_hash, &salt);

    assert_eq!(client.token_id(), token_id);

    let func = Symbol::new(&env, "test_func");
    let args = vec![&env, 100u32.into_val(&env)];

    let result = client.execute(&target_id, &func, &args);

    let val: u32 = result.get(0).unwrap().try_into_val(&env).unwrap();
    assert_eq!(val, 101u32);
    assert_eq!(client.nonce(), 1);

    assert_eq!(client.owner(), owner);
}
