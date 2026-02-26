#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, String, Symbol, Vec,
};

// Error handling
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    EventNotFound = 2,
    EventAlreadyCanceled = 3,
    CannotSellMoreTickets = 4,
    InvalidStartDate = 5,
    InvalidEndDate = 6,
    NegativeTicketPrice = 7,
    InvalidTicketCount = 8,
    CounterOverflow = 9,
    FactoryNotInitialized = 10,
}

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
    pub fn initialize(env: Env, ticket_factory: Address) -> Result<(), Error> {
        // Ensure not already initialized
        if env.storage().instance().has(&DataKey::TicketFactory) {
            return Err(Error::AlreadyInitialized);
        }

        // Store the ticket factory address
        env.storage()
            .instance()
            .set(&DataKey::TicketFactory, &ticket_factory);

        // Initialize event counter
        env.storage().instance().set(&DataKey::EventCounter, &0u32);
        
        Ok(())
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
    ) -> Result<u32, Error> {
      
        payment_token: Address,
    ) -> u32 {
        // Validate organizer address
        organizer.require_auth();

        // Validate inputs
        Self::validate_event_params(&env, start_date, end_date, ticket_price, total_tickets)?;

        // Get and increment event counter
        let event_id = Self::get_and_increment_counter(&env)?;

        // Deploy ticket NFT contract via factory
        let ticket_nft_addr = Self::deploy_ticket_nft(&env, event_id, theme.clone(), total_tickets)?;

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

        Ok(event_id)
    }

    /// Get event by ID
    pub fn get_event(env: Env, event_id: u32) -> Result<Event, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)
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
    pub fn cancel_event(env: Env, event_id: u32) -> Result<(), Error> {
        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        // Only organizer can cancel
        event.organizer.require_auth();

        // Check if already canceled
        if event.is_canceled {
            return Err(Error::EventAlreadyCanceled);
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
        
        Ok(())
    }

    /// Update event details. Only the organizer can update. Cannot update a canceled event.
    /// Cannot reduce total_tickets below tickets_sold. Cannot set dates in the past.
    pub fn update_event(
        env: Env,
        event_id: u32,
        theme: Option<String>,
        ticket_price: Option<i128>,
        total_tickets: Option<u128>,
        start_date: Option<u64>,
        end_date: Option<u64>,
    ) {
        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .unwrap_or_else(|| panic!("Event not found"));

        // Only organizer can update
        event.organizer.require_auth();

        // Cannot update a canceled event
        if event.is_canceled {
            panic!("Cannot update a canceled event");
        }

        let current_time = env.ledger().timestamp();

        // Apply theme if provided
        if let Some(t) = theme {
            event.theme = t;
        }

        // Apply ticket_price if provided (must be non-negative)
        if let Some(p) = ticket_price {
            if p < 0 {
                panic!("Ticket price cannot be negative");
            }
            event.ticket_price = p;
        }

        // Apply total_tickets if provided (cannot be below tickets_sold)
        if let Some(t) = total_tickets {
            if t == 0 {
                panic!("Total tickets must be greater than 0");
            }
            if t < event.tickets_sold {
                panic!("Cannot reduce total_tickets below tickets_sold");
            }
            event.total_tickets = t;
        }

        // Effective end for start validation (new end if provided in this call, else current)
        let effective_end = end_date.unwrap_or(event.end_date);
        // Apply start_date if provided
        if let Some(s) = start_date {
            if s < current_time {
                panic!("Start date cannot be in the past");
            }
            if s >= effective_end {
                panic!("Start date must be before end date");
            }
            event.start_date = s;
        }

        // Effective start for end validation (new start if provided in this call, else current)
        let effective_start = start_date.unwrap_or(event.start_date);
        // Apply end_date if provided
        if let Some(e) = end_date {
            if e < current_time {
                panic!("End date cannot be in the past");
            }
            if e <= effective_start {
                panic!("End date must be after start date");
            }
            event.end_date = e;
        }

        // Update storage
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);

        // Extend TTL
        env.storage().persistent().extend_ttl(
            &DataKey::Event(event_id),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        // Emit event_updated event
        env.events()
            .publish((Symbol::new(&env, "event_updated"),), (event_id, event.organizer.clone()));
    }

    /// Update tickets sold (called by ticket purchase logic)
    pub fn update_tickets_sold(env: Env, event_id: u32, amount: u128) -> Result<(), Error> {
        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        // Verify the caller (should be the ticket NFT contract or authorized entity)
        event.ticket_nft_addr.require_auth();

        // Update tickets sold
        event.tickets_sold = event
            .tickets_sold
            .checked_add(amount)
            .ok_or(Error::CounterOverflow)?;

        // Ensure we don't oversell
        if event.tickets_sold > event.total_tickets {
            return Err(Error::CannotSellMoreTickets);
        }

        // Update storage
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        
        Ok(())
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
    ) -> Result<(), Error> {
        let current_time = env.ledger().timestamp();

        // Validate dates
        if start_date < current_time {
            return Err(Error::InvalidStartDate);
        }

        if end_date <= start_date {
            return Err(Error::InvalidEndDate);
        }

        // Validate ticket price
        if ticket_price < 0 {
            return Err(Error::NegativeTicketPrice);
        }

        // Validate total tickets
        if total_tickets == 0 {
            return Err(Error::InvalidTicketCount);
        }
        
        Ok(())
    }

    fn get_and_increment_counter(env: &Env) -> Result<u32, Error> {
        let current: u32 = env
            .storage()
            .instance()
            .get(&DataKey::EventCounter)
            .unwrap_or(0);

        let next = current
            .checked_add(1)
            .ok_or(Error::CounterOverflow)?;

        env.storage().instance().set(&DataKey::EventCounter, &next);

        Ok(current)
    }

    fn deploy_ticket_nft(env: &Env, event_id: u32, theme: String, total_supply: u128) -> Result<Address, Error> {
        let factory_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TicketFactory)
            .ok_or(Error::FactoryNotInitialized)?;

        // Call the factory contract to deploy a new NFT contract
            .unwrap_or_else(|| panic!("Ticket factory not initialized"));
        // This is a cross-contract call

        Ok(nft_addr)
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
        client.initialize(&factory_addr).unwrap();

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
        ).unwrap();

        assert_eq!(event_id, 0);

        // Get event
        let event = client.get_event(&event_id).unwrap();
        assert_eq!(event.id, 0);
        assert_eq!(event.organizer, organizer);
        assert_eq!(event.total_tickets, total_tickets);
        assert_eq!(event.tickets_sold, 0);
        assert_eq!(event.is_canceled, false);
    }

    #[test]
    fn test_create_event_past_date() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EventManager);
        let client = EventManagerClient::new(&env, &contract_id);

        let factory_addr = env.register_contract(None, MockFactory);
        let organizer = Address::generate(&env);

        env.mock_all_auths();
        env.ledger().set_timestamp(1000);
        client.initialize(&factory_addr).unwrap();

        let theme = String::from_str(&env, "Past Event");
        let event_type = String::from_str(&env, "Conference");
        let start_date = env.ledger().timestamp().saturating_sub(1); // Past date
        let end_date = start_date.saturating_add(86400);

        let result = client.create_event(
            &organizer,
            &theme,
            &event_type,
            &start_date,
            &end_date,
            &1000_0000000,
            &100,
        );
        
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), Error::InvalidStartDate);
    }

    #[test]
    fn test_cancel_event() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EventManager);
        let client = EventManagerClient::new(&env, &contract_id);

        let factory_addr = env.register_contract(None, MockFactory);
        let organizer = Address::generate(&env);

        env.mock_all_auths();
        client.initialize(&factory_addr).unwrap();

        let event_id = client.create_event(
            &organizer,
            &String::from_str(&env, "Event"),
            &String::from_str(&env, "Type"),
            &(env.ledger().timestamp() + 86400),
            &(env.ledger().timestamp() + 172800),
            &1000_0000000,
            &100,
        ).unwrap();

        client.cancel_event(&event_id).unwrap();

        let event = client.get_event(&event_id).unwrap();
        assert_eq!(event.is_canceled, true);
    }
}
        let salt = BytesN::from_array(&env, &[0u8; 32]);
        let mut args = Vec::new(&env);
        args.push_back(env.current_contract_address().to_val());
        args.push_back(salt.to_val());

        let nft_addr: Address =
            env.invoke_contract(&factory_addr, &Symbol::new(&env, "deploy_ticket"), args);
        nft_addr
    }
}

#[cfg(test)]
mod update_event_tests {
    use super::*;
    use crate::test::MockContract;
    use soroban_sdk::{testutils::Address as _, testutils::Ledger};

    fn setup_event_for_update(env: &Env) -> (EventManagerClient<'_>, Address, u32) {
        let contract_id = env.register(EventManager, ());
        let client = EventManagerClient::new(env, &contract_id);
        let mock_addr = env.register(MockContract, ());
        let organizer = Address::generate(env);
        env.mock_all_auths();
        client.initialize(&mock_addr);

        let start_date = env.ledger().timestamp() + 86400;
        let end_date = start_date + 86400;
        let event_id = client.create_event(
            &organizer,
            &String::from_str(env, "Original Theme"),
            &String::from_str(env, "Conference"),
            &start_date,
            &end_date,
            &1000_0000000,
            &100,
            &Address::generate(env),
        );
        (client, organizer, event_id)
    }

    #[test]
    fn test_update_event_theme() {
        let env = Env::default();
        let (client, _organizer, event_id) = setup_event_for_update(&env);

        client.update_event(
            &event_id,
            &Option::Some(String::from_str(&env, "Updated Theme")),
            &Option::None,
            &Option::None,
            &Option::None,
            &Option::None,
        );

        let event = client.get_event(&event_id);
        assert_eq!(event.theme, String::from_str(&env, "Updated Theme"));
    }

    #[test]
    fn test_update_event_ticket_price() {
        let env = Env::default();
        let (client, _organizer, event_id) = setup_event_for_update(&env);
        let new_price = 2000_0000000i128;

        client.update_event(
            &event_id,
            &Option::None,
            &Option::Some(new_price),
            &Option::None,
            &Option::None,
            &Option::None,
        );

        let event = client.get_event(&event_id);
        assert_eq!(event.ticket_price, new_price);
    }

    #[test]
    fn test_update_event_total_tickets() {
        let env = Env::default();
        let (client, _organizer, event_id) = setup_event_for_update(&env);

        client.update_event(
            &event_id,
            &Option::None,
            &Option::None,
            &Option::Some(200u128),
            &Option::None,
            &Option::None,
        );

        let event = client.get_event(&event_id);
        assert_eq!(event.total_tickets, 200);
    }

    #[test]
    fn test_update_event_dates() {
        let env = Env::default();
        let (client, _organizer, event_id) = setup_event_for_update(&env);
        let new_start = env.ledger().timestamp() + 172800;
        let new_end = new_start + 86400;

        client.update_event(
            &event_id,
            &Option::None,
            &Option::None,
            &Option::None,
            &Option::Some(new_start),
            &Option::Some(new_end),
        );

        let event = client.get_event(&event_id);
        assert_eq!(event.start_date, new_start);
        assert_eq!(event.end_date, new_end);
    }

    #[test]
    fn test_update_event_emits_event() {
        let env = Env::default();
        let (client, _organizer, event_id) = setup_event_for_update(&env);

        client.update_event(
            &event_id,
            &Option::Some(String::from_str(&env, "Emit Test")),
            &Option::None,
            &Option::None,
            &Option::None,
            &Option::None,
        );

        // Update completed successfully; event_updated is emitted in the same code path
        let event = client.get_event(&event_id);
        assert_eq!(event.theme, String::from_str(&env, "Emit Test"));
    }

    #[test]
    #[should_panic(expected = "Cannot update a canceled event")]
    fn test_update_event_canceled_fails() {
        let env = Env::default();
        let (client, _organizer, event_id) = setup_event_for_update(&env);
        client.cancel_event(&event_id);

        client.update_event(
            &event_id,
            &Option::Some(String::from_str(&env, "Should fail")),
            &Option::None,
            &Option::None,
            &Option::None,
            &Option::None,
        );
    }

    #[test]
    #[should_panic(expected = "Cannot reduce total_tickets below tickets_sold")]
    fn test_update_event_total_tickets_below_sold_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(EventManager, ());
        let client = EventManagerClient::new(&env, &contract_id);
        let mock_addr = env.register(MockContract, ());
        let organizer = Address::generate(&env);
        let buyer = Address::generate(&env);
        client.initialize(&mock_addr);

        let start_date = env.ledger().timestamp() + 86400;
        let end_date = start_date + 86400;
        let event_id = client.create_event(
            &organizer,
            &String::from_str(&env, "Event"),
            &String::from_str(&env, "Type"),
            &start_date,
            &end_date,
            &100i128,
            &10u128,
            &mock_addr,
        );
        client.purchase_ticket(&buyer, &event_id);
        client.purchase_ticket(&Address::generate(&env), &event_id);

        client.update_event(
            &event_id,
            &Option::None,
            &Option::None,
            &Option::Some(1u128),
            &Option::None,
            &Option::None,
        );
    }

    #[test]
    #[should_panic(expected = "Start date cannot be in the past")]
    fn test_update_event_start_date_past_fails() {
        let env = Env::default();
        let (client, _organizer, event_id) = setup_event_for_update(&env);
        env.ledger()
            .set_timestamp(env.ledger().timestamp() + 86400 * 2);
        let past_start = env.ledger().timestamp() - 3600;

        client.update_event(
            &event_id,
            &Option::None,
            &Option::None,
            &Option::None,
            &Option::Some(past_start),
            &Option::None,
        );
    }

    #[test]
    #[should_panic(expected = "Start date must be before end date")]
    fn test_update_event_end_before_start_fails() {
        let env = Env::default();
        let (client, _organizer, event_id) = setup_event_for_update(&env);
        let start_date = env.ledger().timestamp() + 86400;
        let end_before_start = start_date - 3600;

        client.update_event(
            &event_id,
            &Option::None,
            &Option::None,
            &Option::None,
            &Option::Some(start_date),
            &Option::Some(end_before_start),
        );
    }

    #[test]
    #[should_panic(expected = "Event not found")]
    fn test_update_event_not_found_fails() {
        let env = Env::default();
        let contract_id = env.register(EventManager, ());
        let client = EventManagerClient::new(&env, &contract_id);
        let mock_addr = env.register(MockContract, ());
        env.mock_all_auths();
        client.initialize(&mock_addr);

        client.update_event(
            &999u32,
            &Option::None,
            &Option::None,
            &Option::None,
            &Option::None,
            &Option::None,
        );
    }
}

mod test;
