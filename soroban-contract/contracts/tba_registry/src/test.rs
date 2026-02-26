#![cfg(test)]
extern crate alloc;
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, BytesN, Env, Symbol};

// Import the TBA Account contract WASM for testing
mod tba_account_contract {
    use soroban_sdk::auth::Context;
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/tba_account.optimized.wasm"
    );
}

// Mock NFT Contract
#[contract]
pub struct MockNFT;

#[contractimpl]
impl MockNFT {
    pub fn owner_of(_env: Env, _token_id: u128) -> Address {
        // By default, return a generated address
        // Tests can override this behavior if needed by using mock_all_auths
        // or by specifically setting the return value if using a more complex mock
        Address::generate(&_env)
    }
}

/// Helper function to set up test environment
fn setup_test() -> (
    Env,
    Address,
    TbaRegistryClient<'static>,
    BytesN<32>,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    // Upload the TBA Account WASM and get its hash
    let wasm_hash = env
        .deployer()
        .upload_contract_wasm(tba_account_contract::WASM);

    // Register the registry contract
    let registry_address = env.register(TbaRegistry, (&wasm_hash,));
    let client = TbaRegistryClient::new(&env, &registry_address);

    // Register Mock NFT
    let nft_address = env.register(MockNFT, ());

    (env, registry_address, client, wasm_hash, nft_address)
}

#[test]
fn test_create_account_authorized() {
    let (env, _registry_addr, client, _wasm_hash, nft_addr) = setup_test();

    let token_id = 1u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    // In setup_test, mock_all_auths() is ON.
    // The create_account call will:
    // 1. Call nft_addr.owner_of(token_id) -> returns some address X
    // 2. Call X.require_auth() -> succeeds due to mock_all_auths()

    let deployed_address = client.create_account(&impl_hash, &nft_addr, &token_id, &salt);

    let tba_client = tba_account_contract::Client::new(&env, &deployed_address);
    assert_eq!(tba_client.token_contract(), nft_addr);
    assert_eq!(tba_client.token_id(), token_id);
}

#[test]
fn test_get_account_matches_create_account() {
    let (env, _registry_addr, client, _wasm_hash, nft_addr) = setup_test();

    let token_id = 1u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    // Calculate address without deploying
    let calculated_address = client.get_account(&impl_hash, &nft_addr, &token_id, &salt);

    // Deploy the account
    let deployed_address = client.create_account(&impl_hash, &token_contract, &token_id, &salt).unwrap();

    // They should match
    assert_eq!(calculated_address, deployed_address);
}

#[test]
fn test_multiple_accounts_same_nft() {
    let (env, _registry_addr, client, _wasm_hash, nft_addr) = setup_test();

    let token_id = 42u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);

    let salt1 = BytesN::from_array(&env, &[10u8; 32]);
    let salt2 = BytesN::from_array(&env, &[20u8; 32]);
    let salt3 = BytesN::from_array(&env, &[30u8; 32]);

    // Deploy three accounts for the same NFT with different salts
    let addr1 = client.create_account(&impl_hash, &token_contract, &token_id, &salt1).unwrap();
    let addr2 = client.create_account(&impl_hash, &token_contract, &token_id, &salt2).unwrap();
    let addr3 = client.create_account(&impl_hash, &token_contract, &token_id, &salt3).unwrap();

    // All addresses should be different
    assert_ne!(addr1, addr2);
    assert_ne!(addr2, addr3);
    assert_ne!(addr1, addr3);

    // Account count should be 3
    assert_eq!(
        client.total_deployed_accounts(&token_contract, &token_id),
        3
    );
}

    client.create_account(&impl_hash, &nft_addr, &token_id, &salt1);
    client.create_account(&impl_hash, &nft_addr, &token_id, &salt2);

    let token_contract = Address::generate(&env);
    let token_id = 100u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);

    // Initially zero
    assert_eq!(
        client.total_deployed_accounts(&token_contract, &token_id),
        0
    );

    // Deploy accounts and verify count increments
    for i in 1u8..=5u8 {
        let salt = BytesN::from_array(&env, &[i; 32]);
        client.create_account(&impl_hash, &token_contract, &token_id, &salt).unwrap();
        assert_eq!(
            client.total_deployed_accounts(&token_contract, &token_id),
            i as u32
        );
    }
}

/// Test: Deployed account is properly initialized
#[test]
fn test_deployed_account_initialized() {
    let (env, _registry_addr, client, _wasm_hash) = setup_test();

    let token_contract = Address::generate(&env);
    let token_id = 200u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[50u8; 32]);

    // Deploy the account
    let deployed_address = client.create_account(&impl_hash, &token_contract, &token_id, &salt).unwrap();

    // Create a client for the deployed TBA account
    let tba_client = tba_account_contract::Client::new(&env, &deployed_address);

    // Verify the account is initialized with correct values
    assert_eq!(tba_client.token_contract().unwrap(), token_contract);
    assert_eq!(tba_client.token_id().unwrap(), token_id);
}

/// Test: Cannot create account twice with same parameters
    assert_eq!(client.total_deployed_accounts(&nft_addr, &token_id), 2);
}

#[test]
fn test_cannot_create_account_twice() {
    let (env, _registry_addr, client, _wasm_hash, nft_addr) = setup_test();

    let token_id = 300u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[60u8; 32]);

    // First deployment should succeed
    client.create_account(&impl_hash, &token_contract, &token_id, &salt).unwrap();

    // Second deployment with same parameters should fail
    let result = client.create_account(&impl_hash, &token_contract, &token_id, &salt);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), Error::AccountAlreadyDeployed);
}

/// Test: get_deployed_address returns correct address
#[test]
fn test_get_deployed_address() {
    let (env, _registry_addr, client, _wasm_hash) = setup_test();

    let token_contract = Address::generate(&env);
    let token_id = 400u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[70u8; 32]);

    // Before deployment, should return None
    assert_eq!(
        client.get_deployed_address(&impl_hash, &token_contract, &token_id, &salt),
        None
    );

    // Deploy the account
    let deployed_address = client.create_account(&impl_hash, &token_contract, &token_id, &salt).unwrap();

    // After deployment, should return the address
    assert_eq!(
        client.get_deployed_address(&impl_hash, &token_contract, &token_id, &salt),
        Some(deployed_address)
    );
}

/// Test: Different NFTs have separate account counts
#[test]
fn test_different_nfts_separate_counts() {
    let (env, _registry_addr, client, _wasm_hash) = setup_test();

    let token_contract1 = Address::generate(&env);
    let token_contract2 = Address::generate(&env);
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);

    // Deploy accounts for NFT 1
    let salt1 = BytesN::from_array(&env, &[80u8; 32]);
    client.create_account(&impl_hash, &token_contract1, &1u128, &salt1).unwrap();

    // Deploy accounts for NFT 2
    let salt2 = BytesN::from_array(&env, &[90u8; 32]);
    client.create_account(&impl_hash, &token_contract2, &1u128, &salt2).unwrap();

    // Each NFT should have count of 1
    assert_eq!(client.total_deployed_accounts(&token_contract1, &1u128), 1);
    assert_eq!(client.total_deployed_accounts(&token_contract2, &1u128), 1);

    // Deploy another account for NFT 1
    let salt3 = BytesN::from_array(&env, &[100u8; 32]);
    client.create_account(&impl_hash, &token_contract1, &1u128, &salt3).unwrap();
    // Calculate addresses for different parameters
    let addr1 = client.get_account(
        &impl_hash,
        &token_contract,
        &1u128,
        &BytesN::from_array(&env, &[1u8; 32]),
    );
    let addr2 = client.get_account(
        &impl_hash,
        &token_contract,
        &2u128,
        &BytesN::from_array(&env, &[1u8; 32]),
    );
    let addr3 = client.get_account(
        &impl_hash,
        &token_contract,
        &1u128,
        &BytesN::from_array(&env, &[2u8; 32]),
    );

    // All addresses should be different
    assert_ne!(addr1, addr2);
    assert_ne!(addr1, addr3);
    assert_ne!(addr2, addr3);
}
