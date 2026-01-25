#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    vec, Address, BytesN, Env, Symbol,
};

// Mock NFT contract for testing
#[contract]
pub struct MockNftContract;

#[contractimpl]
impl MockNftContract {
    pub fn owner_of(_env: Env, _token_id: u128) -> Address {
        // Simple mock: return a generated address
        // In real tests, you'd maintain a mapping of token_id -> owner
        // For now, we'll use a generated address for testing
        // This is a placeholder - actual tests would need proper NFT contract integration
        Address::generate(&_env)
    }
}

// Helper to create test environment
fn create_test_env() -> Env {
    let env = Env::default();
    env
}

#[test]
fn test_initialize() {
    let env = create_test_env();
    let contract_id = env.register(TbaAccount, ());
    let client = TbaAccountClient::new(&env, &contract_id);

    let nft_contract = Address::generate(&env);
    let token_id = 1u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    // Initialize should succeed
    client.initialize(&nft_contract, &token_id, &impl_hash, &salt);

    // Verify initialization
    assert_eq!(client.token_contract(), nft_contract);
    assert_eq!(client.token_id(), token_id);
}

#[test]
#[should_panic(expected = "Contract already initialized")]
fn test_initialize_twice_panics() {
    let env = create_test_env();
    let contract_id = env.register(TbaAccount, ());
    let client = TbaAccountClient::new(&env, &contract_id);

    let nft_contract = Address::generate(&env);
    let token_id = 1u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    // First initialization
    client.initialize(&nft_contract, &token_id, &impl_hash, &salt);

    // Second initialization should panic
    client.initialize(&nft_contract, &token_id, &impl_hash, &salt);
}

#[test]
fn test_getter_functions() {
    let env = create_test_env();
    let contract_id = env.register(TbaAccount, ());
    let client = TbaAccountClient::new(&env, &contract_id);

    let nft_contract = Address::generate(&env);
    let token_id = 42u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    client.initialize(&nft_contract, &token_id, &impl_hash, &salt);

    // Test getters
    assert_eq!(client.token_contract(), nft_contract);
    assert_eq!(client.token_id(), token_id);
    
    let (chain_id, contract_addr, id) = client.token();
    assert_eq!(chain_id, 0u32); // We set it to 0
    assert_eq!(contract_addr, nft_contract);
    assert_eq!(id, token_id);
}

#[test]
fn test_nonce_initial_value() {
    let env = create_test_env();
    let contract_id = env.register(TbaAccount, ());
    let client = TbaAccountClient::new(&env, &contract_id);

    let nft_contract = Address::generate(&env);
    let token_id = 1u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    client.initialize(&nft_contract, &token_id, &impl_hash, &salt);

    // Nonce should start at 0
    assert_eq!(client.nonce(), 0u64);
}

#[test]
#[should_panic(expected = "Contract not initialized")]
fn test_execute_before_initialization_panics() {
    let env = create_test_env();
    let contract_id = env.register(TbaAccount, ());
    let client = TbaAccountClient::new(&env, &contract_id);

    let target = Address::generate(&env);
    let func = Symbol::new(&env, "test_func");
    let args = vec![&env];

    // Execute should panic if not initialized
    client.execute(&target, &func, &args);
}

// Note: Testing execute with actual authorization requires more complex setup
// with proper NFT contract integration and auth simulation.
// These tests verify the basic structure and initialization.

