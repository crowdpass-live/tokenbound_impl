#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, BytesN, Env, Symbol};

#[contract]
pub struct MockContract;

#[contractimpl]
impl MockContract {
    // Factory method
    pub fn deploy_ticket(env: Env, _minter: Address, _salt: BytesN<32>) -> Address {
        env.current_contract_address()
    }

    // NFT method
    pub fn mint_ticket_nft(_env: Env, _recipient: Address) -> u128 {
        1
    }

    // Token method
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
}

#[test]
fn test_create_event() {
    let env = Env::default();
    let contract_id = env.register(EventManager, ());
    let client = EventManagerClient::new(&env, &contract_id);

    let mock_addr = env.register(MockContract, ());
    let organizer = Address::generate(&env);

    // Mock the organizer authorization
    env.mock_all_auths();

    // Initialize
    client.initialize(&mock_addr);

    // Create event
    let theme = String::from_str(&env, "Rust Conference 2026");
    let event_type = String::from_str(&env, "Conference");
    let start_date = env.ledger().timestamp() + 86400; // 1 day from now
    let end_date = start_date + 86400; // 2 days from now
    let ticket_price = 1000_0000000; // 100 XLM (7 decimals)
    let total_tickets = 500;
    let payment_token = Address::generate(&env);

    let event_id = client.create_event(
        &organizer,
        &theme,
        &event_type,
        &start_date,
        &end_date,
        &ticket_price,
        &total_tickets,
        &payment_token,
    );

    assert_eq!(event_id, 0);

    // Get event
    let event = client.get_event(&event_id);
    assert_eq!(event.id, 0);
    assert_eq!(event.organizer, organizer);
    assert_eq!(event.total_tickets, total_tickets);
    assert_eq!(event.tickets_sold, 0);
    assert_eq!(event.is_canceled, false);
}

#[test]
#[should_panic(expected = "Start date must be in the future")]
fn test_create_event_past_date() {
    let env = Env::default();
    let contract_id = env.register(EventManager, ());
    let client = EventManagerClient::new(&env, &contract_id);

    let mock_addr = env.register(MockContract, ());
    let organizer = Address::generate(&env);

    env.mock_all_auths();
    env.ledger().set_timestamp(1000);
    client.initialize(&mock_addr);

    let theme = String::from_str(&env, "Past Event");
    let event_type = String::from_str(&env, "Conference");
    let start_date = 500; // Past date
    let end_date = 1500;

    client.create_event(
        &organizer,
        &theme,
        &event_type,
        &start_date,
        &end_date,
        &1000_0000000,
        &100,
        &Address::generate(&env),
    );
}

#[test]
fn test_cancel_event() {
    let env = Env::default();
    let contract_id = env.register(EventManager, ());
    let client = EventManagerClient::new(&env, &contract_id);

    let mock_addr = env.register(MockContract, ());
    let organizer = Address::generate(&env);

    env.mock_all_auths();
    client.initialize(&mock_addr);

    let event_id = client.create_event(
        &organizer,
        &String::from_str(&env, "Event"),
        &String::from_str(&env, "Type"),
        &(env.ledger().timestamp() + 86400),
        &(env.ledger().timestamp() + 172800),
        &1000_0000000,
        &100,
        &Address::generate(&env),
    );

    client.cancel_event(&event_id);

    let event = client.get_event(&event_id);
    assert_eq!(event.is_canceled, true);
}

#[test]
fn test_purchase_ticket() {
    let env = Env::default();
    env.mock_all_auths();

    // Register EventManager
    let contract_id = env.register(EventManager, ());
    let client = EventManagerClient::new(&env, &contract_id);

    // Register Mock
    let mock_addr = env.register(MockContract, ());
    let organizer = Address::generate(&env);
    let buyer = Address::generate(&env);

    // Initialize
    client.initialize(&mock_addr);

    // Create event
    let theme = String::from_str(&env, "Test");
    let event_type = String::from_str(&env, "Type");
    let start_date = env.ledger().timestamp() + 86400;
    let end_date = start_date + 86400;
    let ticket_price = 100i128;
    let total_tickets = 10u128;

    let event_id = client.create_event(
        &organizer,
        &theme,
        &event_type,
        &start_date,
        &end_date,
        &ticket_price,
        &total_tickets,
        &mock_addr, // use mock for payment token too
    );

    // Purchase ticket
    client.purchase_ticket(&buyer, &event_id);

    // Verify tickets sold incremented
    let event = client.get_event(&event_id);
    assert_eq!(event.tickets_sold, 1);
}
