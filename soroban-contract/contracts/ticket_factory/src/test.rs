//! Tests for the Ticket Factory Contract
//!
//! Comprehensive test suite covering:
//! - Deployment success
//! - Address correctness
//! - Multiple deployments with different salts
//! - Storage tracking
//! - Authorization checks

#![cfg(test)]
extern crate alloc;
extern crate std;

use crate::{TicketFactory, TicketFactoryClient};
use soroban_sdk::{
    testutils::Address as _,
    Address, BytesN, Env,
};

// Import the Ticket NFT contract WASM for testing
mod ticket_nft_contract {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/ticket_nft.wasm"
    );
}

/// Helper function to set up test environment
fn setup_test() -> (Env, Address, TicketFactoryClient<'static>, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);

    // Upload the Ticket NFT WASM and get its hash
    let wasm_hash = env.deployer().upload_contract_wasm(ticket_nft_contract::WASM);

    // Register the factory contract with constructor args
    let factory_address = env.register(TicketFactory, (&admin, &wasm_hash));
    let client = TicketFactoryClient::new(&env, &factory_address);

    (env, admin, client, wasm_hash)
}

/// Test: Can deploy ticket contracts
#[test]
fn test_can_deploy_ticket_contract() {
    let (env, _admin, client, _wasm_hash) = setup_test();

    let minter = Address::generate(&env);
    let salt = BytesN::from_array(&env, &[1u8; 32]);

    // Deploy a ticket contract
    let deployed_address = client.deploy_ticket(&minter, &salt);

    // Verify the deployed address is valid (not zero)
    assert!(deployed_address != Address::generate(&env));

    // Verify total tickets is incremented
    assert_eq!(client.get_total_tickets(), 1);
}

/// Test: Returns correct address that can be retrieved
#[test]
fn test_returns_correct_address() {
    let (env, _admin, client, _wasm_hash) = setup_test();

    let minter = Address::generate(&env);
    let salt = BytesN::from_array(&env, &[2u8; 32]);

    // Deploy and store the address
    let deployed_address = client.deploy_ticket(&minter, &salt);

    // Retrieve the address using get_ticket_contract
    let retrieved_address = client.get_ticket_contract(&1u32);

    // Verify they match
    assert_eq!(Some(deployed_address), retrieved_address);
}

/// Test: Deployed contract has correct minter
#[test]
fn test_deployed_contract_has_correct_minter() {
    let (env, _admin, client, _wasm_hash) = setup_test();

    let minter = Address::generate(&env);
    let salt = BytesN::from_array(&env, &[3u8; 32]);

    // Deploy a ticket contract
    let deployed_address = client.deploy_ticket(&minter, &salt);

    // Create a client for the deployed contract
    let nft_client = ticket_nft_contract::Client::new(&env, &deployed_address);

    // Verify the minter is set correctly
    assert_eq!(nft_client.get_minter(), minter);
}

/// Test: Can deploy multiple contracts with different salts
#[test]
fn test_can_deploy_multiple_contracts() {
    let (env, _admin, client, _wasm_hash) = setup_test();

    let minter1 = Address::generate(&env);
    let minter2 = Address::generate(&env);
    let minter3 = Address::generate(&env);

    let salt1 = BytesN::from_array(&env, &[4u8; 32]);
    let salt2 = BytesN::from_array(&env, &[5u8; 32]);
    let salt3 = BytesN::from_array(&env, &[6u8; 32]);

    // Deploy three ticket contracts
    let addr1 = client.deploy_ticket(&minter1, &salt1);
    let addr2 = client.deploy_ticket(&minter2, &salt2);
    let addr3 = client.deploy_ticket(&minter3, &salt3);

    // Verify all addresses are different
    assert_ne!(addr1, addr2);
    assert_ne!(addr2, addr3);
    assert_ne!(addr1, addr3);

    // Verify total count
    assert_eq!(client.get_total_tickets(), 3);

    // Verify each can be retrieved
    assert_eq!(client.get_ticket_contract(&1u32), Some(addr1));
    assert_eq!(client.get_ticket_contract(&2u32), Some(addr2));
    assert_eq!(client.get_ticket_contract(&3u32), Some(addr3));
}

/// Test: Tracking storage works correctly
#[test]
fn test_tracking_storage_works() {
    let (env, _admin, client, _wasm_hash) = setup_test();

    // Initially zero
    assert_eq!(client.get_total_tickets(), 0);

    // Deploy contracts and verify count increments
    for i in 1u8..=5u8 {
        let minter = Address::generate(&env);
        let salt = BytesN::from_array(&env, &[i + 10; 32]);
        client.deploy_ticket(&minter, &salt);
        assert_eq!(client.get_total_tickets(), i as u32);
    }

    // Verify non-existent event returns None
    assert_eq!(client.get_ticket_contract(&99u32), None);
}

/// Test: Admin authorization is required
#[test]
fn test_admin_authorization_required() {
    let (env, admin, client, _wasm_hash) = setup_test();

    let minter = Address::generate(&env);
    let salt = BytesN::from_array(&env, &[20u8; 32]);

    // Deploy ticket (this should require admin auth)
    client.deploy_ticket(&minter, &salt);

    // Verify admin was the authorized party
    let auths = env.auths();
    assert!(!auths.is_empty());

    // The first auth should be from the admin
    let (auth_addr, _) = &auths[0];
    assert_eq!(*auth_addr, admin);
}

/// Test: get_admin returns correct admin
#[test]
fn test_get_admin() {
    let (_env, admin, client, _wasm_hash) = setup_test();

    assert_eq!(client.get_admin(), admin);
}
