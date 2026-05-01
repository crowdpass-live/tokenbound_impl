#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, String};

fn setup(env: &Env) -> (TicketNftClient<'_>, Address) {
    env.mock_all_auths();
    let minter = Address::generate(env);
    let contract_id = env.register(TicketNft, (&minter,));
    (TicketNftClient::new(env, &contract_id), minter)
}

#[test]
fn test_minting_defaults_and_balances() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let token_id1 = client.mint_ticket_nft(&user1);
    let token_id2 = client.mint_ticket_nft(&user2);

    assert_eq!(token_id1, 1);
    assert_eq!(token_id2, 2);
    assert_eq!(client.owner_of(&token_id1), user1);
    assert_eq!(client.owner_of(&token_id2), user2);
    assert_eq!(client.balance_of(&user1), 1);
    assert_eq!(client.balance_of(&user2), 1);

    let metadata = client.get_metadata(&token_id1);
    assert_eq!(metadata.name, String::from_str(&env, "Ticket"));
    assert_eq!(metadata.tier, String::from_str(&env, "General"));
    assert_eq!(metadata.event_id, 0u32);
}

#[test]
fn test_cannot_mint_twice_to_same_user() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let user = Address::generate(&env);

    client.mint_ticket_nft(&user);
    let second = client.try_mint_ticket_nft(&user);
    assert!(second.is_err());
}

#[test]
fn test_transfer_preserves_metadata() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let token_id = client.mint_ticket_nft(&user1);
    let before = client.get_metadata(&token_id);

    client.transfer_from(&user1, &user2, &token_id);

    assert_eq!(client.owner_of(&token_id), user2);
    assert_eq!(client.balance_of(&user1), 0);
    assert_eq!(client.balance_of(&user2), 1);

    let after = client.get_metadata(&token_id);
    assert_eq!(before, after);
}

#[test]
fn test_cannot_transfer_to_user_with_ticket() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let token_id = client.mint_ticket_nft(&user1);
    client.mint_ticket_nft(&user2);

    let res = client.try_transfer_from(&user1, &user2, &token_id);
    assert!(res.is_err());
}

#[test]
fn test_burn_removes_token_and_metadata() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let user = Address::generate(&env);

    let token_id = client.mint_ticket_nft(&user);
    assert!(client.is_valid(&token_id));

    client.burn(&token_id);

    assert!(!client.is_valid(&token_id));
    assert_eq!(client.balance_of(&user), 0);
    assert!(client.try_get_metadata(&token_id).is_err());
}

#[test]
fn test_token_uri_defaults_to_onchain_scheme() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let user = Address::generate(&env);

    let token_id = client.mint_ticket_nft(&user);
    let uri = client.token_uri(&token_id);
    assert_eq!(uri, String::from_str(&env, "onchain://ticket"));
}

#[test]
fn test_minter_can_update_metadata_without_registered_event() {
    let env = Env::default();
    let (client, _minter) = setup(&env);
    let user = Address::generate(&env);

    let token_id = client.mint_ticket_nft(&user);
    let new_name = String::from_str(&env, "VIP Ticket");
    let new_tier = String::from_str(&env, "VIP");

    client.update_metadata(
        &token_id,
        &Some(new_name.clone()),
        &None,
        &None,
        &Some(new_tier.clone()),
    );

    let metadata = client.get_metadata(&token_id);
    assert_eq!(metadata.name, new_name);
    assert_eq!(metadata.tier, new_tier);
}

#[test]
fn test_update_offchain_uri_changes_token_uri() {
    let env = Env::default();
    let (client, _) = setup(&env);
    let user = Address::generate(&env);

    let token_id = client.mint_ticket_nft(&user);
    let uri = String::from_str(&env, "ipfs://cid/1");

    client.update_off_chain_uri(&token_id, &uri);

    let out = client.token_uri(&token_id);
    assert_eq!(out, uri);
}

#[test]
fn test_name_returns_token_name_constant() {
    let env = Env::default();
    let (client, _) = setup(&env);
    assert_eq!(client.name(), String::from_str(&env, TOKEN_NAME));
}

#[test]
fn test_symbol_returns_token_symbol_constant() {
    let env = Env::default();
    let (client, _) = setup(&env);
    assert_eq!(client.symbol(), String::from_str(&env, TOKEN_SYMBOL));
}

#[test]
fn test_name_and_symbol_callable_before_any_mint() {
    // Ensures the new getters do not depend on storage that is only
    // populated after a mint, so off-chain tooling can introspect a freshly
    // deployed contract.
    let env = Env::default();
    let (client, _) = setup(&env);
    assert_eq!(client.name(), String::from_str(&env, "CrowdPass Ticket"));
    assert_eq!(client.symbol(), String::from_str(&env, "TICKET"));
}

#[test]
fn test_name_and_symbol_unchanged_by_burn() {
    // Contract-level metadata is independent of token lifecycle.
    let env = Env::default();
    let (client, _) = setup(&env);
    let user = Address::generate(&env);

    let token_id = client.mint_ticket_nft(&user);
    let name_before = client.name();
    let symbol_before = client.symbol();

    client.burn(&token_id);

    assert_eq!(client.name(), name_before);
    assert_eq!(client.symbol(), symbol_before);
}
