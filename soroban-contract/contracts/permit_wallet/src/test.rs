#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

#[test]
fn test_register_owner_key_and_nonce_default() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PermitWallet, ());
    let client = PermitWalletClient::new(&env, &contract_id);

    let owner = Address::generate(&env);
    let key = BytesN::from_array(&env, &[1u8; 32]);

    client.register_owner_key(&owner, &key).unwrap();
    assert_eq!(client.get_owner_key(&owner).unwrap(), key);
    assert_eq!(client.owner_nonce(&owner), 0);
}
