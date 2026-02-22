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
    let deployed_address = client.create_account(&impl_hash, &nft_addr, &token_id, &salt);

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

    client.create_account(&impl_hash, &nft_addr, &token_id, &salt1);
    client.create_account(&impl_hash, &nft_addr, &token_id, &salt2);

    assert_eq!(client.total_deployed_accounts(&nft_addr, &token_id), 2);
}

#[test]
#[should_panic(expected = "Account already deployed")]
fn test_cannot_create_account_twice() {
    let (env, _registry_addr, client, _wasm_hash, nft_addr) = setup_test();

    let token_id = 300u128;
    let impl_hash = BytesN::from_array(&env, &[1u8; 32]);
    let salt = BytesN::from_array(&env, &[60u8; 32]);

    client.create_account(&impl_hash, &nft_addr, &token_id, &salt);
    client.create_account(&impl_hash, &nft_addr, &token_id, &salt);
}
