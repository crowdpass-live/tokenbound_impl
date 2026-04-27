#![cfg(test)]

//! Fuzz tests for the EventManager contract.
//!
//! Fuzzing is critical for smart contracts because they often handle high-value assets
//! and are exposed to adversarial inputs from anyone on the network. Unlike unit tests
//! that check specific scenarios, fuzzing explores a vast state space to uncover
//! edge cases, such as integer overflows, logic flaws in validation, or unexpected
//! panics that could lead to a Denial of Service (DoS).

use super::*;
use proptest::prelude::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, Address, Env, String, Vec};

// Mock implementation for cross-contract calls
#[contract]
pub struct MockContract;

#[contractimpl]
impl MockContract {
    pub fn deploy_ticket(env: Env, _minter: Address, _salt: BytesN<32>) -> Address {
        env.current_contract_address()
    }

    pub fn mint_ticket_nft(_env: Env, _recipient: Address) -> u128 {
        1
    }

    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
}

fn setup(env: &Env) -> (EventManagerClient<'_>, Address) {
    let contract_id = env.register(EventManager, ());
    let client = EventManagerClient::new(env, &contract_id);
    let mock_addr = env.register(MockContract, ());
    let admin = Address::generate(env);
    env.mock_all_auths();
    let _ = client.try_initialize(&admin, &mock_addr);
    (client, mock_addr)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(50))]

    /// Fuzz test for event creation.
    /// Validates that various inputs for event creation do not cause panics
    /// and that basic constraints hold.
    #[test]
    fn fuzz_create_event(
        theme in "[a-zA-Z0-9 ]{0,100}",
        event_type in "[a-zA-Z0-9 ]{0,50}",
        ticket_price in -1000i128..1000000i128,
        total_tickets in 0u128..10000u128,
        start_date in 0u64..2000000000u64,
        end_date in 0u64..2000000000u64,
    ) {
        let env = Env::default();
        let (client, mock_addr) = setup(&env);
        let organizer = Address::generate(&env);

        // Mock current ledger time to be 1000000
        env.ledger().set_timestamp(1000000);

        let params = CreateEventParams {
            organizer: organizer.clone(),
            theme: String::from_str(&env, &theme),
            event_type: String::from_str(&env, &event_type),
            start_date,
            end_date,
            ticket_price,
            total_tickets,
            payment_token: mock_addr.clone(),
            tiers: Vec::new(&env),
        };

        // Try to create event. We expect it to either succeed or return an Error.
        // It MUST NOT panic.
        let result = client.try_create_event_v2(&params);

        if let Ok(Ok(event_id)) = result {
            let event = client.get_event(&event_id);
            assert_eq!(event.organizer, organizer);
            assert_eq!(event.total_tickets, total_tickets);
            // Invariants
            assert!(event.start_date > 1000000);
            assert!(event.end_date > event.start_date);
            assert!(event.ticket_price >= 0);
            assert!(event.total_tickets > 0);
        }
    }

    /// Fuzz test for ticket operations: purchase, refund, withdraw.
    #[test]
    fn fuzz_ticket_operations(
        quantity in 1u128..20u128,
        tier_index in 0u32..5u32,
    ) {
        let env = Env::default();
        let (client, mock_addr) = setup(&env);
        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);

        env.ledger().set_timestamp(1000000);

        // Setup a valid event first
        let params = CreateEventParams {
            organizer: organizer.clone(),
            theme: String::from_str(&env, "Fuzz Event"),
            event_type: String::from_str(&env, "Test"),
            start_date: 2000000,
            end_date: 3000000,
            ticket_price: 100,
            total_tickets: 100,
            payment_token: mock_addr.clone(),
            tiers: Vec::new(&env),
        };

        if let Ok(Ok(event_id)) = client.try_create_event_v2(&params) {
            // Test purchase
            let purchase_res = client.try_purchase_tickets(&buyer, &event_id, &tier_index, &quantity);

            if purchase_res.is_ok() {
                let event = client.get_event(&event_id);
                // Total supply consistency
                assert!(event.tickets_sold <= event.total_tickets);
            }

            // Test cancel and refund
            client.cancel_event(&event_id);
            let _ = client.try_claim_refund(&buyer, &event_id);

            // Test withdraw (should fail for canceled event)
            env.ledger().set_timestamp(4000000);
            let withdraw_res = client.try_withdraw_funds(&event_id);
            assert!(withdraw_res.is_err() || withdraw_res.unwrap().is_err());
        }
    }
}
