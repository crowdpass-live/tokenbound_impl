#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String, Vec,
};

#[test]
fn test_event_refund_to_tba() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let event_organizer = Address::generate(&env);
    let ticket_buyer = Address::generate(&env);

    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let token_client = token::Client::new(&env, &token_contract);
    let token_admin = token::StellarAssetClient::new(&env, &token_contract);

    token_admin.mint(&event_organizer, &100_000);

    let tba_address = Address::generate(&env);

    let refund_amount = 5000i128;
    token_client.transfer(&event_organizer, &tba_address, &refund_amount);

    assert_eq!(token_client.balance(&tba_address), refund_amount);
    assert_eq!(token_client.balance(&event_organizer), 95_000);
}

#[test]
fn test_batch_refund_multiple_tickets() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let event_organizer = Address::generate(&env);

    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let token_client = token::Client::new(&env, &token_contract);
    let token_admin = token::StellarAssetClient::new(&env, &token_contract);

    token_admin.mint(&event_organizer, &1_000_000);

    let tba1 = Address::generate(&env);
    let tba2 = Address::generate(&env);
    let tba3 = Address::generate(&env);

    let refund_amount = 5000i128;

    token_client.transfer(&event_organizer, &tba1, &refund_amount);
    token_client.transfer(&event_organizer, &tba2, &refund_amount);
    token_client.transfer(&event_organizer, &tba3, &refund_amount);

    assert_eq!(token_client.balance(&tba1), refund_amount);
    assert_eq!(token_client.balance(&tba2), refund_amount);
    assert_eq!(token_client.balance(&tba3), refund_amount);
    assert_eq!(token_client.balance(&event_organizer), 985_000);
}

#[test]
fn test_tba_withdrawal_after_refund() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let event_organizer = Address::generate(&env);
    let ticket_buyer = Address::generate(&env);

    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let token_client = token::Client::new(&env, &token_contract);
    let token_admin = token::StellarAssetClient::new(&env, &token_contract);

    token_admin.mint(&event_organizer, &100_000);

    let tba_address = Address::generate(&env);

    let refund_amount = 5000i128;
    token_client.transfer(&event_organizer, &tba_address, &refund_amount);

    assert_eq!(token_client.balance(&tba_address), refund_amount);

    token_client.transfer(&tba_address, &ticket_buyer, &refund_amount);

    assert_eq!(token_client.balance(&tba_address), 0);
    assert_eq!(token_client.balance(&ticket_buyer), refund_amount);
}

#[test]
fn test_partial_refund_scenario() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let event_organizer = Address::generate(&env);
    let ticket_buyer = Address::generate(&env);

    let token_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let token_client = token::Client::new(&env, &token_contract);
    let token_admin = token::StellarAssetClient::new(&env, &token_contract);

    token_admin.mint(&event_organizer, &100_000);

    let tba_address = Address::generate(&env);

    let ticket_price = 10_000i128;
    let partial_refund = 7_000i128;

    token_client.transfer(&event_organizer, &tba_address, &partial_refund);

    assert_eq!(token_client.balance(&tba_address), partial_refund);

    token_client.transfer(&tba_address, &ticket_buyer, &partial_refund);

    assert_eq!(token_client.balance(&ticket_buyer), partial_refund);
}

#[test]
fn test_multiple_assets_in_tba() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let event_organizer = Address::generate(&env);

    let usdc_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let usdc_client = token::Client::new(&env, &usdc_contract);
    let usdc_admin = token::StellarAssetClient::new(&env, &usdc_contract);

    let xlm_contract = env.register_stellar_asset_contract_v2(admin.clone());
    let xlm_client = token::Client::new(&env, &xlm_contract);
    let xlm_admin = token::StellarAssetClient::new(&env, &xlm_contract);

    usdc_admin.mint(&event_organizer, &100_000);
    xlm_admin.mint(&event_organizer, &50_000);

    let tba_address = Address::generate(&env);

    usdc_client.transfer(&event_organizer, &tba_address, &5000);
    xlm_client.transfer(&event_organizer, &tba_address, &1000);

    assert_eq!(usdc_client.balance(&tba_address), 5000);
    assert_eq!(xlm_client.balance(&tba_address), 1000);
}
