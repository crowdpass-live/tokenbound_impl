use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

#[test]
fn test_mint_and_metadata() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let recipient = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://badge-meta");

    let contract_id = env.register(PoapNft, (&minter,));
    let client = PoapNftClient::new(&env, &contract_id);

    let token_id = client.mint_poap(&recipient, &42u32, &uri);
    assert_eq!(token_id, 1u128);
    assert_eq!(client.owner_of(&token_id), recipient);
    assert_eq!(client.balance_of(&recipient), 1u128);

    let meta = client.token_metadata(&token_id);
    assert_eq!(meta.event_id, 42u32);
    assert_eq!(meta.uri, uri);
    assert!(client.has_claimed(&42u32, &recipient));
}

#[test]
fn test_batch_mint_poap() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let a = Address::generate(&env);
    let b = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://batch");

    let contract_id = env.register(PoapNft, (&minter,));
    let client = PoapNftClient::new(&env, &contract_id);

    let mut recipients = Vec::new(&env);
    recipients.push_back(a.clone());
    recipients.push_back(b.clone());

    client.batch_mint_poap(&recipients, &7u32, &uri);

    assert_eq!(client.balance_of(&a), 1u128);
    assert_eq!(client.balance_of(&b), 1u128);
}

#[test]
fn test_duplicate_same_recipient_event_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let recipient = Address::generate(&env);
    let uri = String::from_str(&env, "ipfs://x");

    let contract_id = env.register(PoapNft, (&minter,));
    let client = PoapNftClient::new(&env, &contract_id);

    client.mint_poap(&recipient, &1u32, &uri);
    let r = client.try_mint_poap(&recipient, &1u32, &uri);
    assert!(r.is_err());
}
