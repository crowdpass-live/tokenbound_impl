//! End-to-end integration tests for the full CrowdPass ticket lifecycle.
//!
//! Tests cross-contract interactions across all contracts:
//! - TicketFactory, TicketNFT, EventManager, TbaRegistry, TbaAccount
//!
//! Test Scenarios:
//! 1. Happy path: Factory -> Event -> Purchase -> Attend -> POAP (TBA)
//! 2. Cancellation: Factory -> Event -> Purchase -> Cancel -> Refund
//! 3. Transfer: Factory -> Event -> Purchase -> Transfer -> New owner TBA
//! 4. TBA execution: Factory -> Event -> Purchase -> Create TBA -> Execute through TBA

#![cfg(test)]
extern crate alloc;
extern crate std;

use soroban_sdk::{
    contract, contractimpl, testutils::Address as _, vec, Address, BytesN, Env, IntoVal, String,
    Symbol, TryIntoVal, Val, Vec,
};

// ── WASM imports ──

mod ticket_nft {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/ticket_nft.wasm"
    );
}

mod ticket_factory {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/ticket_factory.wasm"
    );
}

mod event_manager {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/event_manager.wasm"
    );
}

mod tba_registry {
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/tba_registry.wasm"
    );
}

mod tba_account {
    use soroban_sdk::auth::Context;
    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/tba_account.wasm"
    );
}

// ── Mock token for payments ──

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn transfer(_env: Env, _from: Address, _to: Address, _amount: i128) {}
}

// ── Target contract for TBA execution tests ──

#[contract]
pub struct TargetContract;

#[contractimpl]
impl TargetContract {
    pub fn ping(env: Env, value: u32) -> Vec<u32> {
        vec![&env, value + 1]
    }
}

// ── Helpers ──

struct TestSetup {
    env: Env,
    #[allow(dead_code)]
    factory_client: ticket_factory::Client<'static>,
    event_client: event_manager::Client<'static>,
    registry_client: tba_registry::Client<'static>,
    tba_wasm_hash: BytesN<32>,
    #[allow(dead_code)]
    admin: Address,
    payment_token: Address,
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let admin = Address::generate(&env);

    // 1. Upload ticket_nft WASM and deploy factory
    let nft_wasm_hash = env.deployer().upload_contract_wasm(ticket_nft::WASM);
    let factory_id = env.register(ticket_factory::WASM, (&admin, &nft_wasm_hash));
    let factory_client = ticket_factory::Client::new(&env, &factory_id);

    // 2. Deploy event manager, initialize with factory
    let event_id = env.register(event_manager::WASM, ());
    let event_client = event_manager::Client::new(&env, &event_id);
    event_client.initialize(&admin, &factory_id);

    // 3. Deploy TBA registry
    let tba_wasm_hash = env.deployer().upload_contract_wasm(tba_account::WASM);
    let registry_id = env.register(tba_registry::WASM, (&admin, &tba_wasm_hash));
    let registry_client = tba_registry::Client::new(&env, &registry_id);

    // 4. Mock payment token
    let payment_token = env.register(MockToken, ());

    TestSetup {
        env,
        factory_client,
        event_client,
        registry_client,
        tba_wasm_hash,
        admin,
        payment_token,
    }
}

fn create_event(s: &TestSetup, organizer: &Address) -> u32 {
    let start = s.env.ledger().timestamp() + 86400;
    let end = start + 86400;
    s.event_client.create_event(
        organizer,
        &String::from_str(&s.env, "Integration Test Event"),
        &String::from_str(&s.env, "Conference"),
        &start,
        &end,
        &100i128,
        &10u128,
        &s.payment_token,
    )
}

// ═══════════════════════════════════════════════════════════════════
// Scenario 1: Happy path — Factory → Event → Purchase → TBA (POAP)
// ═══════════════════════════════════════════════════════════════════

#[test]
fn test_full_happy_path_purchase_and_create_tba() {
    let s = setup();
    let organizer = Address::generate(&s.env);
    let buyer = Address::generate(&s.env);

    // Create event (deploys NFT contract via factory)
    let event_id = create_event(&s, &organizer);
    let event = s.event_client.get_event(&event_id);
    assert_eq!(event.tickets_sold, 0);
    assert_eq!(event.total_tickets, 10);

    // Purchase ticket
    s.event_client.purchase_ticket(&buyer, &event_id, &0u32);
    let event = s.event_client.get_event(&event_id);
    assert_eq!(event.tickets_sold, 1);

    // Verify NFT ownership via the deployed ticket contract
    let nft_addr = event.ticket_nft_addr;
    let nft_client = ticket_nft::Client::new(&s.env, &nft_addr);
    assert_eq!(nft_client.balance_of(&buyer), 1);
    let token_id = 1u128; // first mint
    assert_eq!(nft_client.owner_of(&token_id), buyer);

    // Create TBA for the ticket (simulates POAP / badge account)
    let impl_hash = s.tba_wasm_hash.clone();
    let salt = BytesN::from_array(&s.env, &[1u8; 32]);
    let tba_addr = s
        .registry_client
        .create_account(&impl_hash, &nft_addr, &token_id, &salt);

    let tba_client = tba_account::Client::new(&s.env, &tba_addr);
    assert_eq!(tba_client.token_contract(), nft_addr);
    assert_eq!(tba_client.token_id(), token_id);
    assert_eq!(tba_client.owner(), buyer);
}

// ═══════════════════════════════════════════════════════════════════
// Scenario 2: Cancellation — Purchase → Cancel → Claim refund
// ═══════════════════════════════════════════════════════════════════

#[test]
fn test_cancel_event_and_claim_refund() {
    let s = setup();
    let organizer = Address::generate(&s.env);
    let buyer1 = Address::generate(&s.env);
    let buyer2 = Address::generate(&s.env);

    let event_id = create_event(&s, &organizer);

    // Two buyers purchase tickets
    s.event_client.purchase_ticket(&buyer1, &event_id, &0u32);
    s.event_client.purchase_ticket(&buyer2, &event_id, &0u32);
    assert_eq!(s.event_client.get_event(&event_id).tickets_sold, 2);

    // Organizer cancels
    s.event_client.cancel_event(&event_id);
    assert!(s.event_client.get_event(&event_id).is_canceled);

    // Both buyers claim refunds
    s.event_client.claim_refund(&buyer1, &event_id);
    s.event_client.claim_refund(&buyer2, &event_id);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_refund_fails_if_event_not_canceled() {
    let s = setup();
    let organizer = Address::generate(&s.env);
    let buyer = Address::generate(&s.env);

    let event_id = create_event(&s, &organizer);
    s.event_client.purchase_ticket(&buyer, &event_id, &0u32);

    // Attempt refund without cancellation
    s.event_client.claim_refund(&buyer, &event_id);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_double_refund_fails() {
    let s = setup();
    let organizer = Address::generate(&s.env);
    let buyer = Address::generate(&s.env);

    let event_id = create_event(&s, &organizer);
    s.event_client.purchase_ticket(&buyer, &event_id, &0u32);
    s.event_client.cancel_event(&event_id);

    s.event_client.claim_refund(&buyer, &event_id);
    s.event_client.claim_refund(&buyer, &event_id); // should panic
}

#[test]
#[should_panic(expected = "HostError")]
fn test_refund_fails_for_non_buyer() {
    let s = setup();
    let organizer = Address::generate(&s.env);
    let buyer = Address::generate(&s.env);
    let stranger = Address::generate(&s.env);

    let event_id = create_event(&s, &organizer);
    s.event_client.purchase_ticket(&buyer, &event_id, &0u32);
    s.event_client.cancel_event(&event_id);

    s.event_client.claim_refund(&stranger, &event_id);
}

// ═══════════════════════════════════════════════════════════════════
// Scenario 3: Transfer — Purchase → Transfer → New owner claims TBA
// ═══════════════════════════════════════════════════════════════════

#[test]
fn test_transfer_ticket_and_new_owner_creates_tba() {
    let s = setup();
    let organizer = Address::generate(&s.env);
    let buyer = Address::generate(&s.env);
    let recipient = Address::generate(&s.env);

    let event_id = create_event(&s, &organizer);
    s.event_client.purchase_ticket(&buyer, &event_id, &0u32);

    let event = s.event_client.get_event(&event_id);
    let nft_addr = event.ticket_nft_addr;
    let nft_client = ticket_nft::Client::new(&s.env, &nft_addr);
    let token_id = 1u128;

    // Verify original owner
    assert_eq!(nft_client.owner_of(&token_id), buyer);

    // Transfer ticket
    nft_client.transfer_from(&buyer, &recipient, &token_id);
    assert_eq!(nft_client.owner_of(&token_id), recipient);
    assert_eq!(nft_client.balance_of(&buyer), 0);
    assert_eq!(nft_client.balance_of(&recipient), 1);

    // New owner creates TBA
    let impl_hash = s.tba_wasm_hash.clone();
    let salt = BytesN::from_array(&s.env, &[2u8; 32]);
    let tba_addr = s
        .registry_client
        .create_account(&impl_hash, &nft_addr, &token_id, &salt);

    let tba_client = tba_account::Client::new(&s.env, &tba_addr);
    assert_eq!(tba_client.owner(), recipient);
}

// ═══════════════════════════════════════════════════════════════════
// Scenario 4: TBA execution — Purchase → Create TBA → Execute
// ═══════════════════════════════════════════════════════════════════

#[test]
fn test_create_tba_and_execute_through_it() {
    let s = setup();
    let organizer = Address::generate(&s.env);
    let buyer = Address::generate(&s.env);

    let event_id = create_event(&s, &organizer);
    s.event_client.purchase_ticket(&buyer, &event_id, &0u32);

    let event = s.event_client.get_event(&event_id);
    let nft_addr = event.ticket_nft_addr;
    let token_id = 1u128;

    // Create TBA
    let impl_hash = s.tba_wasm_hash.clone();
    let salt = BytesN::from_array(&s.env, &[3u8; 32]);
    let tba_addr = s
        .registry_client
        .create_account(&impl_hash, &nft_addr, &token_id, &salt);
    let tba_client = tba_account::Client::new(&s.env, &tba_addr);

    assert_eq!(tba_client.nonce(), 0);

    // Execute a call through the TBA
    let target_id = s.env.register(TargetContract, ());
    let func = Symbol::new(&s.env, "ping");
    let args: Vec<Val> = vec![&s.env, 42u32.into_val(&s.env)];

    let result = tba_client.execute(&target_id, &func, &args);
    let val: u32 = result.get(0).unwrap().try_into_val(&s.env).unwrap();
    assert_eq!(val, 43);
    assert_eq!(tba_client.nonce(), 1);

    // Execute again — nonce increments
    let result2 = tba_client.execute(&target_id, &func, &args);
    let val2: u32 = result2.get(0).unwrap().try_into_val(&s.env).unwrap();
    assert_eq!(val2, 43);
    assert_eq!(tba_client.nonce(), 2);
}

// ═══════════════════════════════════════════════════════════════════
// Error paths — cross-contract edge cases
// ═══════════════════════════════════════════════════════════════════

#[test]
#[should_panic(expected = "HostError")]
fn test_purchase_sold_out_event() {
    let s = setup();
    let organizer = Address::generate(&s.env);

    // Create event with only 1 ticket
    let start = s.env.ledger().timestamp() + 86400;
    let end = start + 86400;
    let event_id = s.event_client.create_event(
        &organizer,
        &String::from_str(&s.env, "Tiny Event"),
        &String::from_str(&s.env, "Workshop"),
        &start,
        &end,
        &50i128,
        &1u128,
        &s.payment_token,
    );

    s.event_client
        .purchase_ticket(&Address::generate(&s.env), &event_id, &0u32);
    // Second purchase should fail
    s.event_client
        .purchase_ticket(&Address::generate(&s.env), &event_id, &0u32);
}

#[test]
#[should_panic(expected = "HostError")]
fn test_purchase_canceled_event_fails() {
    let s = setup();
    let organizer = Address::generate(&s.env);

    let event_id = create_event(&s, &organizer);
    s.event_client.cancel_event(&event_id);

    s.event_client
        .purchase_ticket(&Address::generate(&s.env), &event_id, &0u32);
}

#[test]
fn test_factory_tracks_deployed_contracts() {
    let s = setup();
    let organizer = Address::generate(&s.env);

    // Each create_event deploys a new NFT contract via factory
    let id1 = create_event(&s, &organizer);
    // Rate limit: second create for the same organizer needs a later ledger time
    s.env
        .ledger()
        .set_timestamp(s.env.ledger().timestamp() + 200);
    let id2 = create_event(&s, &organizer);

    let event1 = s.event_client.get_event(&id1);
    let event2 = s.event_client.get_event(&id2);

    // Different NFT contracts per event
    assert_ne!(event1.ticket_nft_addr, event2.ticket_nft_addr);
}
