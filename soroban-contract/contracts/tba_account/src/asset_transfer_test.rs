#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String,
};

fn create_token_contract<'a>(env: &Env, admin: &Address) -> (Address, token::Client<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        contract_address.clone(),
        token::Client::new(env, &contract_address),
    )
}

fn create_token_admin_client<'a>(
    env: &Env,
    admin: &Address,
) -> (Address, token::Client<'a>, token::StellarAssetClient<'a>) {
    let contract_address = env.register_stellar_asset_contract_v2(admin.clone());
    (
        contract_address.clone(),
        token::Client::new(env, &contract_address),
        token::StellarAssetClient::new(env, &contract_address),
    )
}

#[test]
fn test_transfer_token_success() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token_addr, token_client, token_admin) = create_token_admin_client(&env, &admin);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    token_admin.mint(&from, &1000);

    let result = asset_transfer::transfer_token(&env, &token_addr, &from, &to, 500);
    assert!(result.is_ok());

    assert_eq!(token_client.balance(&from), 500);
    assert_eq!(token_client.balance(&to), 500);
}

#[test]
fn test_transfer_token_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token_addr, _token_client, token_admin) = create_token_admin_client(&env, &admin);

    let from = Address::generate(&env);
    let to = Address::generate(&env);

    token_admin.mint(&from, &100);

    let result = asset_transfer::transfer_token(&env, &token_addr, &from, &to, 500);
    assert_eq!(result, Err(asset_transfer::TransferError::InsufficientBalance));
}

#[test]
fn test_transfer_token_invalid_amount() {
    let env = Env::default();
    let token_addr = Address::generate(&env);
    let from = Address::generate(&env);
    let to = Address::generate(&env);

    let result = asset_transfer::transfer_token(&env, &token_addr, &from, &to, 0);
    assert_eq!(result, Err(asset_transfer::TransferError::InvalidAmount));

    let result = asset_transfer::transfer_token(&env, &token_addr, &from, &to, -100);
    assert_eq!(result, Err(asset_transfer::TransferError::InvalidAmount));
}

#[test]
fn test_get_token_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token_addr, _token_client, token_admin) = create_token_admin_client(&env, &admin);

    let account = Address::generate(&env);
    token_admin.mint(&account, &5000);

    let balance = asset_transfer::get_token_balance(&env, &token_addr, &account);
    assert_eq!(balance, 5000);
}

#[test]
fn test_batch_transfer_tokens() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token_addr, token_client, token_admin) = create_token_admin_client(&env, &admin);

    let from = Address::generate(&env);
    let recipient1 = Address::generate(&env);
    let recipient2 = Address::generate(&env);
    let recipient3 = Address::generate(&env);

    token_admin.mint(&from, &10000);

    let recipients = soroban_sdk::vec![
        &env,
        (recipient1.clone(), 1000i128),
        (recipient2.clone(), 2000i128),
        (recipient3.clone(), 3000i128),
    ];

    let result = asset_transfer::batch_transfer_tokens(&env, &token_addr, &from, recipients);
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 3);

    assert_eq!(token_client.balance(&from), 4000);
    assert_eq!(token_client.balance(&recipient1), 1000);
    assert_eq!(token_client.balance(&recipient2), 2000);
    assert_eq!(token_client.balance(&recipient3), 3000);
}

#[test]
fn test_batch_transfer_partial_failure() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token_addr, _token_client, token_admin) = create_token_admin_client(&env, &admin);

    let from = Address::generate(&env);
    let recipient1 = Address::generate(&env);

    token_admin.mint(&from, &500);

    let recipients = soroban_sdk::vec![
        &env,
        (recipient1.clone(), 1000i128),
    ];

    let result = asset_transfer::batch_transfer_tokens(&env, &token_addr, &from, recipients);
    assert_eq!(result, Err(asset_transfer::TransferError::PartialBatchFailure));
}

#[test]
fn test_approve_token_transfer() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token_addr, token_client, _token_admin) = create_token_admin_client(&env, &admin);

    let owner = Address::generate(&env);
    let spender = Address::generate(&env);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let expiration_ledger = env.ledger().sequence() + 100;

    let result = asset_transfer::approve_token_transfer(
        &env,
        &token_addr,
        &owner,
        &spender,
        1000,
        expiration_ledger,
    );
    assert!(result.is_ok());

    let allowance = token_client.allowance(&owner, &spender);
    assert_eq!(allowance, 1000);
}

#[test]
fn test_transfer_from_with_allowance() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token_addr, token_client, token_admin) = create_token_admin_client(&env, &admin);

    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    token_admin.mint(&owner, &5000);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let expiration_ledger = env.ledger().sequence() + 100;
    token_client.approve(&owner, &spender, &2000, &expiration_ledger);

    let result = asset_transfer::transfer_from(
        &env,
        &token_addr,
        &owner,
        &recipient,
        1000,
        &spender,
    );
    assert!(result.is_ok());

    assert_eq!(token_client.balance(&owner), 4000);
    assert_eq!(token_client.balance(&recipient), 1000);
    assert_eq!(token_client.allowance(&owner, &spender), 1000);
}

#[test]
fn test_transfer_from_insufficient_allowance() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let (token_addr, token_client, token_admin) = create_token_admin_client(&env, &admin);

    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);

    token_admin.mint(&owner, &5000);

    env.ledger().with_mut(|li| {
        li.timestamp = 1000;
    });

    let expiration_ledger = env.ledger().sequence() + 100;
    token_client.approve(&owner, &spender, &500, &expiration_ledger);

    let result = asset_transfer::transfer_from(
        &env,
        &token_addr,
        &owner,
        &recipient,
        1000,
        &spender,
    );
    assert_eq!(result, Err(asset_transfer::TransferError::InsufficientBalance));
}
