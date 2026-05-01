#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Env, BytesN, Symbol, vec};

#[contract]
pub struct MockFactory;

#[contractimpl]
impl MockFactory {
    pub fn deploy_ticket(env: Env, _minter: Address, _salt: BytesN<32>) -> Address {
        // Just return a random address for the "NFT"
        Address::generate(&env)
    }
}

fn setup(env: &Env) -> (EventManagerClient<'_>, Address) {
    let contract_id = env.register(EventManager, ());
    let client = EventManagerClient::new(env, &contract_id);
    
    let factory_id = env.register(MockFactory, ());
    
    let admin = Address::generate(env);
    
    env.mock_all_auths();
    
    // Initialize the contract
    let _ = client.try_initialize(&admin, &factory_id);
    
    (client, factory_id)
}

#[test]
fn test_initialize() {
    let env = Env::default();
    let (client, factory_id) = setup(&env);
    
    // Check if it's initialized by trying to initialize again
    let admin2 = Address::generate(&env);
    let res = client.try_initialize(&admin2, &factory_id);
    assert!(res.is_err() || res.unwrap().is_err());
}

#[test]
fn test_create_event() {
    let env = Env::default();
    let (client, factory_id) = setup(&env);
    let organizer = Address::generate(&env);
    
    env.ledger().set_timestamp(1000);
    
    let params = CreateEventParams {
        organizer: organizer.clone(),
        theme: String::from_str(&env, "Test Theme"),
        event_type: String::from_str(&env, "Test Type"),
        start_date: 2000,
        end_date: 3000,
        ticket_price: 100,
        total_tickets: 100,
        payment_token: Address::generate(&env),
        tiers: Vec::new(&env),
    };
    
    let event_id = client.create_event_v2(&params);
    let event = client.get_event(&event_id);
    
    assert_eq!(event.organizer, organizer);
    assert_eq!(event.total_tickets, 100);
}