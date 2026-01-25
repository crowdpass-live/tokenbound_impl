#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, Symbol};

/// Helper function to create a test event in storage
fn setup_test_event(env: &Env, organizer: &Address, event_id: u32, end_date: u64) {
    let ticket_addr = Address::generate(env);

    let event = Event {
        id: event_id,
        theme: Symbol::new(env, "test_theme"),
        organizer: organizer.clone(),
        event_type: Symbol::new(env, "conference"),
        total_tickets: 100,
        tickets_sold: 0,
        ticket_price: 1000,
        start_date: 1000,
        end_date,
        is_canceled: false,
        event_ticket_addr: ticket_addr,
    };

    env.storage()
        .instance()
        .set(&DataKey::EventCount, &event_id);
    env.storage()
        .instance()
        .set(&DataKey::Event(event_id), &event);
}

#[test]
fn test_reschedule_event_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EventManagerContract, ());
    let client = EventManagerContractClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);

    // Set up a test event with end_date in the future
    env.ledger().set_timestamp(500);
    env.as_contract(&contract_id, || {
        setup_test_event(&env, &organizer, 1, 2000);
    });

    // Reschedule the event
    let new_start_date: u64 = 1500;
    let new_end_date: u64 = 3000;
    client.reschedule_event(&1, &new_start_date, &new_end_date);

    // Verify the event was updated
    let updated_event = client.get_event(&1);
    assert_eq!(updated_event.start_date, new_start_date);
    assert_eq!(updated_event.end_date, new_end_date);
    assert_eq!(updated_event.is_canceled, false);
}

#[test]
#[should_panic(expected = "Event does not exist")]
fn test_reschedule_nonexistent_event() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EventManagerContract, ());
    let client = EventManagerContractClient::new(&env, &contract_id);

    // Try to reschedule an event that doesn't exist
    client.reschedule_event(&999, &1500, &3000);
}

#[test]
#[should_panic(expected = "Event has already ended")]
fn test_reschedule_ended_event() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(EventManagerContract, ());
    let client = EventManagerContractClient::new(&env, &contract_id);

    let organizer = Address::generate(&env);

    // Set up a test event with end_date in the past
    env.as_contract(&contract_id, || {
        setup_test_event(&env, &organizer, 1, 1000);
    });

    // Set current timestamp after the event end
    env.ledger().set_timestamp(2000);

    // Try to reschedule - should fail because event has ended
    client.reschedule_event(&1, &2500, &3500);
}

#[test]
fn test_get_event_count() {
    let env = Env::default();

    let contract_id = env.register(EventManagerContract, ());
    let client = EventManagerContractClient::new(&env, &contract_id);

    // Initially should be 0
    assert_eq!(client.get_event_count(), 0);

    let organizer = Address::generate(&env);

    // Add an event
    env.as_contract(&contract_id, || {
        setup_test_event(&env, &organizer, 1, 2000);
    });

    // Should now be 1
    assert_eq!(client.get_event_count(), 1);
}
