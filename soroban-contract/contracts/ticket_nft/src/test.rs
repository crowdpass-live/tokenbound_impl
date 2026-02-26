#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

#[test]
fn test_minting() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter,));
    let client = TicketNftClient::new(&env, &contract_id);

    // Mint first ticket
    let token_id1 = client.mint_ticket_nft(&user1).unwrap();
    assert_eq!(token_id1, 1);
    assert_eq!(client.owner_of(&token_id1).unwrap(), user1);
    assert_eq!(client.balance_of(&user1), 1);

    // Mint second ticket
    let token_id2 = client.mint_ticket_nft(&user2).unwrap();
    assert_eq!(token_id2, 2);
    assert_eq!(client.owner_of(&token_id2).unwrap(), user2);
    assert_eq!(client.balance_of(&user2), 1);
}

#[test]
fn test_cannot_mint_twice_to_same_user() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter,));
    let client = TicketNftClient::new(&env, &contract_id);

    client.mint_ticket_nft(&user).unwrap();
    let result = client.mint_ticket_nft(&user);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), Error::UserAlreadyHasTicket);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter,));
    let client = TicketNftClient::new(&env, &contract_id);

    let token_id = client.mint_ticket_nft(&user1).unwrap();

    client.transfer_from(&user1, &user2, &token_id).unwrap();

    assert_eq!(client.owner_of(&token_id).unwrap(), user2);
    assert_eq!(client.balance_of(&user1), 0);
    assert_eq!(client.balance_of(&user2), 1);
}

#[test]
fn test_cannot_transfer_to_user_with_ticket() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter,));
    let client = TicketNftClient::new(&env, &contract_id);

    let token_id1 = client.mint_ticket_nft(&user1).unwrap();
    let _token_id2 = client.mint_ticket_nft(&user2).unwrap();

    let result = client.transfer_from(&user1, &user2, &token_id1);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), Error::RecipientAlreadyHasTicket);
}

#[test]
#[should_panic] // Only authorized minter can mint
fn test_only_minter_can_mint() {
    let env = Env::default();
    // env.mock_all_auths(); // Don't mock auth to test failure

    let minter = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter,));
    let client = TicketNftClient::new(&env, &contract_id);

    // Without mock_all_auths, require_auth() will fail for the minter
    let _ = client.mint_ticket_nft(&user);
}

#[test]
fn test_burn() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter,));
    let client = TicketNftClient::new(&env, &contract_id);

    let token_id = client.mint_ticket_nft(&user).unwrap();
    assert!(client.is_valid(&token_id));

    client.burn(&token_id);
    assert!(!client.is_valid(&token_id));
    assert_eq!(client.balance_of(&user), 0);
}

#[test]
fn test_cannot_transfer_burned_token() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter,));
    let client = TicketNftClient::new(&env, &contract_id);

    let token_id = client.mint_ticket_nft(&user1).unwrap();
    client.burn(&token_id);

    let result = client.transfer_from(&user1, &user2, &token_id);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), Error::InvalidTokenId);
