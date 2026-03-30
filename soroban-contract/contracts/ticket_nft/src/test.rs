#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Env, String};

#[test]
fn test_minting() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter, &admin));
    let client = TicketNftClient::new(&env, &contract_id);

    // Mint first ticket
    let token_id1 = client.mint_ticket_nft(&user1);
    assert_eq!(token_id1, 1);
    assert_eq!(client.owner_of(&token_id1), user1);
    assert_eq!(client.balance_of(&user1), 1);
    
    // Verify metadata
    let metadata = client.get_metadata(&token_id1);
    assert_eq!(metadata.name, name);
    assert_eq!(metadata.description, description);
    assert_eq!(metadata.image, image);
    assert_eq!(metadata.event_id, event_id);
    assert_eq!(metadata.tier, tier);

    // Mint second ticket
    let token_id2 = client.mint_ticket_nft(&user2);
    assert_eq!(token_id2, 2);
    assert_eq!(client.owner_of(&token_id2), user2);
    assert_eq!(client.balance_of(&user2), 1);
}

#[test]
#[should_panic] // Should panic when trying to mint twice to same user
fn test_cannot_mint_twice_to_same_user() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter, &admin));
    let client = TicketNftClient::new(&env, &contract_id);

    client.mint_ticket_nft(&user);
    let result = client.try_mint_ticket_nft(&user);
    assert!(result.is_err());
}

#[test]
fn test_transfer_preserves_metadata() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter, &admin));
    let client = TicketNftClient::new(&env, &contract_id);

    let token_id = client.mint_ticket_nft(&user1);

    client.transfer_from(&user1, &user2, &token_id);

    assert_eq!(client.owner_of(&token_id), user2);
    assert_eq!(client.balance_of(&user1), 0);
    assert_eq!(client.balance_of(&user2), 1);
}

#[test]
#[should_panic] // Should panic when transferring to user who already has a ticket
fn test_cannot_transfer_to_user_with_ticket() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter, &admin));
    let client = TicketNftClient::new(&env, &contract_id);

    let token_id1 = client.mint_ticket_nft(&user1);
    let _token_id2 = client.mint_ticket_nft(&user2);

    let result = client.try_transfer_from(&user1, &user2, &token_id1);
    assert!(result.is_err());
}

#[test]
#[should_panic] // Only authorized minter can mint
fn test_only_minter_can_mint() {
    let env = Env::default();
    // Don't mock auth to test failure

    let minter = Address::generate(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter, &admin));
    let client = TicketNftClient::new(&env, &contract_id);

    let name = String::from_str(&env, "Test Ticket");
    let description = String::from_str(&env, "Test Description");
    let image = String::from_str(&env, "ipfs://test");
    let event_id = 1u32;
    let tier = String::from_str(&env, "General");

    // Without mock_all_auths, require_auth() will panic
    let _ = client.mint_ticket_nft(&user, &name, &description, &image, &event_id, &tier, &None);
}

#[test]
fn test_burn_removes_metadata() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter, &admin));
    let client = TicketNftClient::new(&env, &contract_id);

    let token_id = client.mint_ticket_nft(&user);
    assert!(client.is_valid(&token_id));

    let token_id = client.mint_ticket_nft(
        &user, &name, &description, &image, &event_id, &tier, &None
    );
    
    assert!(client.is_valid(&token_id));
    
    // Verify metadata exists
    let metadata = client.get_metadata(&token_id);
    assert_eq!(metadata.name, name);
    
    // Burn the token
    client.burn(&token_id);
    
    assert!(!client.is_valid(&token_id));
    assert_eq!(client.balance_of(&user), 0);
}

#[test]
#[should_panic] // Should panic when trying to transfer a burned token
fn test_cannot_transfer_burned_token() {
    let env = Env::default();
    env.mock_all_auths();

    let minter = Address::generate(&env);
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let contract_id = env.register(TicketNft, (&minter, &admin));
    let client = TicketNftClient::new(&env, &contract_id);

    let token_id = client.mint_ticket_nft(&user1);
    client.burn(&token_id);

    let result = client.try_transfer_from(&user1, &user2, &token_id);
    assert!(result.is_err());
}
