#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, IntoVal, String, Symbol, Vec,
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
        };

        // Store event
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);

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

    fn deploy_ticket_nft(env: &Env, event_id: u32, theme: String, total_supply: u128) -> Address {
        let factory_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TicketFactory)
            .unwrap_or_else(|| panic!("Ticket factory not initialized"));

        // Call the factory contract to deploy a new NFT contract
        // This is a cross-contract call
        use soroban_sdk::vec;

        let nft_addr: Address = env.invoke_contract(
            &factory_addr,
            &Symbol::new(env, "deploy_ticket_nft"),
            vec![
                env,
                event_id.into_val(env),
                theme.into_val(env),
                total_supply.into_val(env),
            ],
        );

        nft_addr
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, testutils::Ledger, vec, Env, Symbol};

    #[contract]
    pub struct MockFactory;

    #[contractimpl]
    impl MockFactory {
        pub fn deploy_ticket_nft(
            env: Env,
            _event_id: u32,
            _theme: String,
            _total_supply: u128,
        ) -> Address {
            Address::generate(&env)
        }
    }

    #[test]
    fn test_create_event() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EventManager);
        let client = EventManagerClient::new(&env, &contract_id);

        let factory_addr = env.register_contract(None, MockFactory);
        let organizer = Address::generate(&env);

        // Mock the organizer authorization
        env.mock_all_auths();

        // Initialize
        client.initialize(&factory_addr);

        // Create event
        let theme = String::from_str(&env, "Rust Conference 2026");
        let event_type = String::from_str(&env, "Conference");
        let start_date = env.ledger().timestamp() + 86400; // 1 day from now
        let end_date = start_date + 86400; // 2 days from now
        let ticket_price = 1000_0000000; // 100 XLM (7 decimals)
        let total_tickets = 500;

        let event_id = client.create_event(
            &organizer,
            &theme,
            &event_type,
            &start_date,
            &end_date,
            &ticket_price,
            &total_tickets,
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
        let contract_id = env.register_contract(None, EventManager);
        let client = EventManagerClient::new(&env, &contract_id);

        let factory_addr = env.register_contract(None, MockFactory);
        let organizer = Address::generate(&env);

        env.mock_all_auths();
        env.ledger().set_timestamp(1000);
        client.initialize(&factory_addr);

        let theme = String::from_str(&env, "Past Event");
        let event_type = String::from_str(&env, "Conference");
        let start_date = env.ledger().timestamp().saturating_sub(1); // Past date
        let end_date = start_date.saturating_add(86400);

        client.create_event(
            &organizer,
            &theme,
            &event_type,
            &start_date,
            &end_date,
            &1000_0000000,
            &100,
        );
    }

    #[test]
    fn test_cancel_event() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EventManager);
        let client = EventManagerClient::new(&env, &contract_id);

        let factory_addr = env.register_contract(None, MockFactory);
        let organizer = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(&factory_addr);

        let event_id = client.create_event(
            &organizer,
            &String::from_str(&env, "Event"),
            &String::from_str(&env, "Type"),
            &(env.ledger().timestamp() + 86400),
            &(env.ledger().timestamp() + 172800),
            &1000_0000000,
            &100,
        );

        client.cancel_event(&event_id);

        let event = client.get_event(&event_id);
        assert_eq!(event.is_canceled, true);
    }
}
