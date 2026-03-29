//! Build WASM first: `cargo build --target wasm32-unknown-unknown --release` from `soroban-contract/`.

use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, vec, Address, BytesN, Env, IntoVal, Symbol,
    TryIntoVal, Vec,
};

// Import contracts
mod nft {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/ticket_nft.wasm"
    );
}

mod registry {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/tba_registry.wasm"
    );
}

mod account {
    use soroban_sdk::auth::Context;
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/tba_account.wasm"
    );
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

#[test]
fn test_integration_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let user = Address::generate(&env);

    // 1. Deploy Ticket NFT (constructor sets minter)
    let nft_id = env.register(nft::WASM, (&minter,));
    let nft_client = nft::Client::new(&env, &nft_id);

    // 2. Mint ticket to user
    let token_id = nft_client.mint_ticket_nft(&user);
    assert_eq!(token_id, 1u128);
    assert_eq!(nft_client.owner_of(&token_id), user);

    // 3. Setup TBA Registry
    let tba_wasm_hash = env.deployer().upload_contract_wasm(account::WASM);
    let registry_id = env.register(registry::WASM, (tba_wasm_hash.clone(),));
    let registry_client = registry::Client::new(&env, &registry_id);

    // 4. Create TBA via Registry
    let impl_hash = tba_wasm_hash;
    let salt = BytesN::from_array(&env, &[0u8; 32]);

    let tba_address = registry_client.create_account(&impl_hash, &nft_id, &token_id, &salt);
    let tba_client = account::Client::new(&env, &tba_address);

    // Verify TBA details
    assert_eq!(tba_client.token_contract(), nft_id);
    assert_eq!(tba_client.token_id(), token_id);

    // 5. Execute a transaction through the TBA as the ticket owner
    let target_id = env.register(TargetContract, ());
    let func = Symbol::new(&env, "test_func");

    // TbaAccount::execute expects Vec<Val> for args
    let args = vec![&env, 100u32.into_val(&env)];

    // Call execute as the user (who owns the NFT)
    let result = tba_client.execute(&target_id, &func, &args);

    // Extract the result from the return Vec
    let val: u32 = result.get(0).unwrap().try_into_val(&env).unwrap();
    assert_eq!(val, 101);
    assert_eq!(tba_client.nonce(), 1);
}
