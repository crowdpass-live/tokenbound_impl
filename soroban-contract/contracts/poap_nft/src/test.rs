#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env, String};

use crate::{PoapMetadata, PoapNft, PoapNftClient};

#[test]
fn test_mint_and_metadata_and_uri() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let contract_id = env.register(PoapNft, (&minter,));
    let client = PoapNftClient::new(&env, &contract_id);

    let recipient = Address::generate(&env);
    let md = PoapMetadata {
        event_id: 7,
        name: String::from_str(&env, "POAP #7"),
        description: String::from_str(&env, "Attended Event #7"),
        image: String::from_str(&env, "ipfs://image"),
        issued_at: 123,
    };

    let token_id = client.mint_poap(&recipient, &md);
    assert_eq!(token_id, 1u128);
    assert_eq!(client.owner_of(&token_id), recipient);
    assert_eq!(client.balance_of(&recipient), 1u128);

    let stored = client.get_metadata(&token_id);
    assert_eq!(stored, md);

    let uri = client.token_uri(&token_id);
    assert_eq!(uri, String::from_str(&env, "onchain://poap"));
}

#[test]
fn test_only_one_poap_per_event_per_recipient() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let contract_id = env.register(PoapNft, (&minter,));
    let client = PoapNftClient::new(&env, &contract_id);

    let recipient = Address::generate(&env);
    let md = PoapMetadata {
        event_id: 1,
        name: String::from_str(&env, "POAP"),
        description: String::from_str(&env, "desc"),
        image: String::from_str(&env, ""),
        issued_at: 1,
    };

    client.mint_poap(&recipient, &md);
    let result = client.try_mint_poap(&recipient, &md);
    assert!(result.is_err());
}
