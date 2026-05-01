#![cfg(test)]

//! Fuzz tests for the EventManager contract.
//!
//! Fuzzing is critical for smart contracts because they often handle high-value assets
//! and are exposed to adversarial inputs from anyone on the network. Unlike unit tests
//! that check specific scenarios, fuzzing explores a vast state space to uncover
//! edge cases, such as integer overflows, logic flaws in validation, or unexpected
//! panics that could lead to a Denial of Service (DoS).

use super::*;
use fuzz_helpers::{arb_ascii_text, arb_i128_range, arb_u128_range, arb_u32_range, arb_u64_range, assert_invariant};
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, Env, String, Vec};
use proptest::prelude::*;

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
    env.mock_all_auths();
    let admin = Address::generate(env);
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
        theme in arb_ascii_text(100),
        event_type in arb_ascii_text(50),
        ticket_price in arb_i128_range(-1000, 1000000),
        total_tickets in arb_u128_range(0, 10000),
        start_date in arb_u64_range(0, 2000000000),
        end_date in arb_u64_range(0, 2000000000),
    ) {
        let env = Env::default();
        let (client, mock_addr) = setup(&env);
        let organizer = Address::generate(&env);

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

        let result = client.try_create_event_v2(&params);

        if let Ok(Ok(event_id)) = result {
            let event = client.get_event(&event_id);
            assert_eq!(event.organizer, organizer);
            assert_eq!(event.total_tickets, total_tickets);
            assert_invariant(event.start_date > 1000000, "events must start in the future");
            assert_invariant(event.end_date > event.start_date, "end date must be after start date");
            assert_invariant(event.ticket_price >= 0, "ticket price must be non-negative");
            assert_invariant(event.total_tickets > 0, "event must have at least one ticket");
        }
    }

    /// Fuzz test for ticket operations: purchase, refund, withdraw.
    #[test]
    fn fuzz_ticket_operations(
        quantity in arb_u128_range(1, 20),
        tier_index in arb_u32_range(0, 5),
    ) {
        let env = Env::default();
        let (client, mock_addr) = setup(&env);
        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);

        env.ledger().set_timestamp(1000000);

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
            let purchase_res = client.try_purchase_tickets(&buyer, &event_id, &tier_index, &quantity);
            if purchase_res.is_ok() {
                let event = client.get_event(&event_id);
                assert_invariant(event.tickets_sold <= event.total_tickets, "tickets sold must not exceed total supply");
            }

            client.cancel_event(&event_id);
            let _ = client.try_claim_refund(&buyer, &event_id);

            env.ledger().set_timestamp(4000000);
            let withdraw_res = client.try_withdraw_funds(&event_id);
            assert!(withdraw_res.is_err() || withdraw_res.unwrap().is_err());
        }
    }
}
