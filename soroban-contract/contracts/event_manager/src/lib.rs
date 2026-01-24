#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

/// Storage keys for the contract
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    EventCount,
    Event(u32),
}

/// Event data structure
#[derive(Clone)]
#[contracttype]
pub struct Event {
    pub id: u32,
    pub theme: Symbol,
    pub organizer: Address,
    pub event_type: Symbol,
    pub total_tickets: u128,
    pub tickets_sold: u128,
    pub ticket_price: u128,
    pub start_date: u64,
    pub end_date: u64,
    pub is_canceled: bool,
    pub event_ticket_addr: Address,
}

#[contract]
pub struct EventManagerContract;

#[contractimpl]
impl EventManagerContract {
    /// Reschedule an existing event with new start and end dates.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `event_id` - The ID of the event to reschedule
    /// * `start_date` - The new start date (unix timestamp)
    /// * `end_date` - The new end date (unix timestamp)
    ///
    /// # Panics
    /// * If the event does not exist
    /// * If the caller is not the event organizer
    /// * If the event has already ended
    pub fn reschedule_event(env: Env, event_id: u32, start_date: u64, end_date: u64) {
        // Get the event count to verify event exists
        let event_count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::EventCount)
            .unwrap_or(0);

        // Check that event exists
        if event_id == 0 || event_id > event_count {
            panic!("Event does not exist");
        }

        // Get the event from storage
        let event: Event = env
            .storage()
            .instance()
            .get(&DataKey::Event(event_id))
            .expect("Event not found");

        // Verify the organizer is authorized to reschedule
        // require_auth ensures only the organizer can call this function
        event.organizer.require_auth();

        // Check that the event has not ended yet
        let current_timestamp = env.ledger().timestamp();
        if event.end_date <= current_timestamp {
            panic!("Event has already ended");
        }

        // Create updated event with new dates
        let updated_event = Event {
            id: event.id,
            theme: event.theme,
            organizer: event.organizer,
            event_type: event.event_type,
            total_tickets: event.total_tickets,
            tickets_sold: event.tickets_sold,
            ticket_price: event.ticket_price,
            start_date,
            end_date,
            is_canceled: false,
            event_ticket_addr: event.event_ticket_addr,
        };

        // Store the updated event
        env.storage()
            .instance()
            .set(&DataKey::Event(event_id), &updated_event);

        // Emit EventRescheduled event
        env.events().publish(
            (symbol_short!("resched"), event_id),
            (start_date, end_date),
        );
    }

    /// Get an event by its ID
    pub fn get_event(env: Env, event_id: u32) -> Event {
        env.storage()
            .instance()
            .get(&DataKey::Event(event_id))
            .expect("Event not found")
    }

    /// Get the total number of events
    pub fn get_event_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::EventCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
