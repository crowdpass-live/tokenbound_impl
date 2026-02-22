#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, String, Symbol, Vec,
};

// Storage keys
#[contracttype]
pub enum DataKey {
    Event(u32),
    EventCounter,
    TicketFactory,
}

// Event structure
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Event {
    pub id: u32,
    pub theme: String,
    pub organizer: Address,
    pub event_type: String,
    pub total_tickets: u128,
    pub tickets_sold: u128,
    pub ticket_price: i128,
    pub start_date: u64,
    pub end_date: u64,
    pub is_canceled: bool,
    pub ticket_nft_addr: Address,
    pub payment_token: Address,
}

#[contract]
pub struct EventManager;

#[contractimpl]
impl EventManager {
    /// Initialize the contract with the ticket factory address
    pub fn initialize(env: Env, ticket_factory: Address) {
        // Ensure not already initialized
        if env.storage().instance().has(&DataKey::TicketFactory) {
            panic!("Already initialized");
        }

        // Store the ticket factory address
        env.storage()
            .instance()
            .set(&DataKey::TicketFactory, &ticket_factory);

        // Initialize event counter
        env.storage().instance().set(&DataKey::EventCounter, &0u32);
    }

    /// Create a new event
    pub fn create_event(
        env: Env,
        organizer: Address,
        theme: String,
        event_type: String,
        start_date: u64,
        end_date: u64,
        ticket_price: i128,
        total_tickets: u128,
        payment_token: Address,
    ) -> u32 {
        // Validate organizer address
        organizer.require_auth();

        // Validate inputs
        Self::validate_event_params(&env, start_date, end_date, ticket_price, total_tickets);

        // Get and increment event counter
        let event_id = Self::get_and_increment_counter(&env);

        // Deploy ticket NFT contract via factory
        let ticket_nft_addr = Self::deploy_ticket_nft(&env, event_id, theme.clone(), total_tickets);

        // Create event struct
        let event = Event {
            id: event_id,
            theme: theme.clone(),
            organizer: organizer.clone(),
            event_type,
            total_tickets,
            tickets_sold: 0,
            ticket_price,
            start_date,
            end_date,
            is_canceled: false,
            ticket_nft_addr: ticket_nft_addr.clone(),
            payment_token,
        };

        // Store event
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);

        // Extend TTL for the new event
        env.storage().persistent().extend_ttl(
            &DataKey::Event(event_id),
            30 * 24 * 60 * 60 / 5,  // threshold (~30 days)
            100 * 24 * 60 * 60 / 5, // extend_to (~100 days)
        );

        // Emit event creation event
        env.events().publish(
            (Symbol::new(&env, "event_created"),),
            (event_id, organizer, ticket_nft_addr),
        );

        event_id
    }

    /// Get event by ID
    pub fn get_event(env: Env, event_id: u32) -> Event {
        env.storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic!("Event not found"))
    }

    /// Get total number of events
    pub fn get_event_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::EventCounter)
            .unwrap_or(0)
    }

    /// Get all events (pagination recommended for production)
    pub fn get_all_events(env: Env) -> Vec<Event> {
        let count = Self::get_event_count(env.clone());
        let mut events = Vec::new(&env);

        for i in 0..count {
            if let Some(event) = env.storage().persistent().get(&DataKey::Event(i)) {
                events.push_back(event);
            }
        }

        events
    }

    /// Cancel an event
    pub fn cancel_event(env: Env, event_id: u32) {
        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic!("Event not found"));

        // Only organizer can cancel
        event.organizer.require_auth();

        // Check if already canceled
        if event.is_canceled {
            panic!("Event already canceled");
        }

        // Mark as canceled
        event.is_canceled = true;

        // Update storage
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);

        // Emit cancellation event
        env.events()
            .publish((Symbol::new(&env, "event_canceled"),), event_id);
    }

    /// Update tickets sold (called by ticket purchase logic)
    pub fn update_tickets_sold(env: Env, event_id: u32, amount: u128) {
        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic!("Event not found"));

        // Verify the caller (should be the ticket NFT contract or authorized entity)
        event.ticket_nft_addr.require_auth();

        // Update tickets sold
        event.tickets_sold = event
            .tickets_sold
            .checked_add(amount)
            .unwrap_or_else(|| panic!("Overflow in tickets sold"));

        // Ensure we don't oversell
        if event.tickets_sold > event.total_tickets {
            panic!("Cannot sell more tickets than available");
        }

        // Update storage
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
    }

    /// Purchase a ticket for an event
    pub fn purchase_ticket(env: Env, buyer: Address, event_id: u32) {
        buyer.require_auth();

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic!("Event not found"));

        if event.is_canceled {
            panic!("Event is canceled");
        }

        if event.tickets_sold >= event.total_tickets {
            panic!("Event is sold out");
        }

        // Handle payment
        if event.ticket_price > 0 {
            let token_client = soroban_sdk::token::Client::new(&env, &event.payment_token);
            token_client.transfer(&buyer, &event.organizer, &event.ticket_price);
        }

        // Mint ticket NFT
        env.invoke_contract::<u128>(
            &event.ticket_nft_addr,
            &Symbol::new(&env, "mint_ticket_nft"),
            soroban_sdk::vec![&env, buyer.into_val(&env)],
        );

        // Update tickets sold
        event.tickets_sold += 1;

        // Store updated event
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);

        // Extend TTL
        env.storage().persistent().extend_ttl(
            &DataKey::Event(event_id),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        // Emit purchase event
        env.events().publish(
            (Symbol::new(&env, "ticket_purchased"),),
            (event_id, buyer, event.ticket_nft_addr),
        );
    }

    // ========== Helper Functions ==========

    fn validate_event_params(
        env: &Env,
        start_date: u64,
        end_date: u64,
        ticket_price: i128,
        total_tickets: u128,
    ) {
        let current_time = env.ledger().timestamp();

        // Validate dates
        if start_date < current_time {
            panic!("Start date must be in the future");
        }

        if end_date <= start_date {
            panic!("End date must be after start date");
        }

        // Validate ticket price
        if ticket_price < 0 {
            panic!("Ticket price cannot be negative");
        }

        // Validate total tickets
        if total_tickets == 0 {
            panic!("Total tickets must be greater than 0");
        }
    }

    fn get_and_increment_counter(env: &Env) -> u32 {
        let current: u32 = env
            .storage()
            .instance()
            .get(&DataKey::EventCounter)
            .unwrap_or(0);

        let next = current
            .checked_add(1)
            .unwrap_or_else(|| panic!("Event counter overflow"));

        env.storage().instance().set(&DataKey::EventCounter, &next);

        current
    }

    fn deploy_ticket_nft(
        env: &Env,
        _event_id: u32,
        _theme: String,
        _total_supply: u128,
    ) -> Address {
        let factory_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TicketFactory)
            .unwrap_or_else(|| panic!("Ticket factory not initialized"));
        // This is a cross-contract call

        let salt = BytesN::from_array(&env, &[0u8; 32]);
        let mut args = Vec::new(&env);
        args.push_back(env.current_contract_address().to_val());
        args.push_back(salt.to_val());

        let nft_addr: Address =
            env.invoke_contract(&factory_addr, &Symbol::new(&env, "deploy_ticket"), args);
        nft_addr
    }
}

mod test;
