#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

#[test]
fn test_minting() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TicketNFT, ());
    let client = TicketNFTClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&minter);

    // Mint first ticket
    let token_id1 = client.mint_ticket_nft(&user1);
    assert_eq!(token_id1, 1);
    assert_eq!(client.owner_of(&token_id1), user1);
    assert_eq!(client.balance_of(&user1), 1);

    // Mint second ticket
    let token_id2 = client.mint_ticket_nft(&user2);
    assert_eq!(token_id2, 2);
    assert_eq!(client.owner_of(&token_id2), user2);
    assert_eq!(client.balance_of(&user2), 1);
}

#[test]
#[should_panic(expected = "User already has ticket")]
fn test_cannot_mint_twice_to_same_user() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TicketNFT, ());
    let client = TicketNFTClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&minter);

    client.mint_ticket_nft(&user);
    client.mint_ticket_nft(&user); // Should panic
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TicketNFT, ());
    let client = TicketNFTClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&minter);

    let token_id = client.mint_ticket_nft(&user1);

    client.transfer_from(&user1, &user2, &token_id);

    assert_eq!(client.owner_of(&token_id), user2);
    assert_eq!(client.balance_of(&user1), 0);
    assert_eq!(client.balance_of(&user2), 1);
}

#[test]
#[should_panic(expected = "Recipient already has a ticket")]
fn test_cannot_transfer_to_user_with_ticket() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TicketNFT, ());
    let client = TicketNFTClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&minter);

    let token_id1 = client.mint_ticket_nft(&user1);
    let _token_id2 = client.mint_ticket_nft(&user2);

    client.transfer_from(&user1, &user2, &token_id1); // Should panic
}

#[test]
#[should_panic] // Only authorized minter can mint
fn test_only_minter_can_mint() {
    let env = Env::default();
    // env.mock_all_auths(); // Don't mock auth to test failure

    let contract_id = env.register_contract(None, TicketNFT);
    let client = TicketNFTClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let _user = Address::generate(&env);
    let _non_minter = Address::generate(&env);

    client.initialize(&minter);

    // This should fail because we're not calling as minter and haven't mocked auths
    // To be more precise, we can use env.set_auths or mock_all_auths and then check if require_auth was called.
    // In Soroban tests, mock_all_auth() makes it so any require_auth() succeeds.
    // To test failures, we can either not mock, or selectively mock.

    // If we don't mock, it should fail.
    client.mint_ticket_nft(&Address::generate(&env));
}

#[test]
fn test_burn() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TicketNFT, ());
    let client = TicketNFTClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let user = Address::generate(&env);

    client.initialize(&minter);

    let token_id = client.mint_ticket_nft(&user);
    assert!(client.is_valid(&token_id));

    client.burn(&token_id);
    assert!(!client.is_valid(&token_id));
    assert_eq!(client.balance_of(&user), 0);
}

#[test]
#[should_panic(expected = "Token is not valid")]
fn test_cannot_transfer_burned_token() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(TicketNFT, ());
    let client = TicketNFTClient::new(&env, &contract_id);

    let minter = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    client.initialize(&minter);

    let token_id = client.mint_ticket_nft(&user1);
    client.burn(&token_id);

    client.transfer_from(&user1, &user2, &token_id); // Should panic
}
