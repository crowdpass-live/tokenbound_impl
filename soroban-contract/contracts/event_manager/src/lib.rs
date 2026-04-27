#![no_std]

use core::convert::TryFrom;

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, IntoVal, String,
    Symbol, Vec,
};

use upgradeable as upg;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
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
    InvalidTierIndex = 11,
    TierSoldOut = 12,
    InvalidTierConfig = 13,
    EventNotCanceled = 14,
    RefundAlreadyClaimed = 15,
    NotABuyer = 16,
    EventSoldOut = 17,
    TicketsBelowSold = 18,
    EventNotEnded = 19,
    FundsAlreadyWithdrawn = 20,
    InvalidStringInput = 21,
    TicketPriceOutOfRange = 22,
    TooManyOrganizerEvents = 23,
    EventCreationRateLimited = 24,
    EventScheduleOutOfRange = 25,
    TooManyTicketTiers = 26,
    PurchaseQuantityTooLarge = 27,
    AlreadyArchived = 28,
    ArchiveNotAllowed = 29,
}

#[contracttype]
pub enum DataKey {
    Event(u32),
    ArchivedEvent(u32),
    EventCounter,
    TicketFactory,
    RefundClaimed(u32, Address),
    EventBuyers(u32),
    EventTiers(u32),
    BuyerPurchase(u32, Address),
    Waitlist(u32),
    EventBalance(u32),
    FundsWithdrawn(u32),
    OrganizerOpenEventCount(Address),
    OrganizerLastCreateTs(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketTier {
    pub name: String,
    pub price: i128,
    pub total_quantity: u128,
    pub sold_quantity: u128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TierConfig {
    pub name: String,
    pub price: i128,
    pub total_quantity: u128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreateEventParams {
    pub organizer: Address,
    pub theme: String,
    pub event_type: String,
    pub start_date: u64,
    pub end_date: u64,
    pub ticket_price: i128,
    pub total_tickets: u128,
    pub payment_token: Address,
    pub tiers: Vec<TierConfig>,
}

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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ArchivedEvent {
    pub id: u32,
    pub organizer: Address,
    pub total_tickets: u128,
    pub tickets_sold: u128,
    pub total_collected: i128,
    pub is_canceled: bool,
    pub archived_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BuyerPurchase {
    pub quantity: u128,
    pub total_paid: i128,
}

#[contract]
pub struct EventManager;

#[contractimpl]
impl EventManager {
    const MAX_STRING_BYTES: u32 = 200;
    const MAX_TICKET_TIERS: u32 = 32;
    const MAX_TICKETS_PER_EVENT: u128 = 500_000;
    const MAX_TICKET_PRICE: i128 = 10_000_000_000_000_000;
    const MAX_ORGANIZER_OPEN_EVENTS: u32 = 50;
    const EVENT_CREATE_COOLDOWN_SECS: u64 = 120;
    const MAX_EVENT_DURATION_SECS: u64 = 366 * 86_400;
    const MAX_EVENT_START_AHEAD_SECS: u64 = 5 * 366 * 86_400;
    const MAX_PURCHASE_QUANTITY: u128 = 500;

    pub fn initialize(env: Env, admin: Address, ticket_factory: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::TicketFactory) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        upg::set_admin(&env, &admin);
        upg::init_version(&env);
        env.storage()
            .instance()
            .set(&DataKey::TicketFactory, &ticket_factory);
        env.storage().instance().set(&DataKey::EventCounter, &0u32);
        upg::extend_instance_ttl(&env);
        Ok(())
    }

    pub fn initialize_legacy(env: Env, ticket_factory: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::TicketFactory) {
            return Err(Error::AlreadyInitialized);
        }
        upg::set_admin(&env, &ticket_factory);
        upg::init_version(&env);
        env.storage()
            .instance()
            .set(&DataKey::TicketFactory, &ticket_factory);
        env.storage().instance().set(&DataKey::EventCounter, &0u32);
        upg::extend_instance_ttl(&env);
        Ok(())
    }

    pub fn create_event_with_tiers(env: Env, params: CreateEventParams) -> Result<u32, Error> {
        upg::require_not_paused(&env);
        params.organizer.require_auth();

        Self::validate_create_schedule(&env, params.start_date, params.end_date)?;
        Self::validate_bounded_string(&params.theme, Self::MAX_STRING_BYTES)?;
        Self::validate_bounded_string(&params.event_type, Self::MAX_STRING_BYTES)?;
        Self::validate_ticket_price(params.ticket_price)?;

        if !params.tiers.is_empty() && params.tiers.len() > Self::MAX_TICKET_TIERS {
            return Err(Error::TooManyTicketTiers);
        }

        Self::enforce_organizer_limits_and_rate(&env, &params.organizer)?;

        let resolved_tiers = if params.tiers.is_empty() {
            if params.total_tickets == 0 || params.total_tickets > Self::MAX_TICKETS_PER_EVENT {
                return Err(Error::InvalidTicketCount);
            }
            let mut v = Vec::new(&env);
            v.push_back(TicketTier {
                name: String::from_str(&env, "General"),
                price: params.ticket_price,
                total_quantity: params.total_tickets,
                sold_quantity: 0,
            });
            v
        } else {
            let mut v = Vec::new(&env);
            for cfg in params.tiers.iter() {
                Self::validate_bounded_string(&cfg.name, Self::MAX_STRING_BYTES)?;
                if cfg.price < 0 {
                    return Err(Error::NegativeTicketPrice);
                }
                Self::validate_ticket_price(cfg.price)?;
                if cfg.total_quantity == 0 || cfg.total_quantity > Self::MAX_TICKETS_PER_EVENT {
                    return Err(Error::InvalidTierConfig);
                }
                v.push_back(TicketTier {
                    name: cfg.name.clone(),
                    price: cfg.price,
                    total_quantity: cfg.total_quantity,
                    sold_quantity: 0,
                });
            }
            v
        };

        let agg_total: u128 = resolved_tiers.iter().map(|t| t.total_quantity).sum();
        if agg_total == 0 || agg_total > Self::MAX_TICKETS_PER_EVENT {
            return Err(Error::InvalidTicketCount);
        }

        let agg_price = resolved_tiers
            .first()
            .map(|t| t.price)
            .unwrap_or(params.ticket_price);

        let event_id = Self::get_and_increment_counter(&env)?;
        let ticket_nft_addr = Self::deploy_ticket_nft(&env, event_id)?;

        let event = Event {
            id: event_id,
            theme: params.theme,
            organizer: params.organizer.clone(),
            event_type: params.event_type,
            total_tickets: agg_total,
            tickets_sold: 0,
            ticket_price: agg_price,
            start_date: params.start_date,
            end_date: params.end_date,
            is_canceled: false,
            ticket_nft_addr: ticket_nft_addr.clone(),
            payment_token: params.payment_token,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        env.storage()
            .persistent()
            .set(&DataKey::EventTiers(event_id), &resolved_tiers);

        Self::extend_persistent_ttl(&env, &DataKey::Event(event_id));
        Self::extend_persistent_ttl(&env, &DataKey::EventTiers(event_id));
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "event_created"),),
            (event_id, params.organizer.clone(), ticket_nft_addr),
        );

        Self::commit_organizer_create(&env, &params.organizer);

        Ok(event_id)
    }

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
    ) -> Result<u32, Error> {
        let params = CreateEventParams {
            organizer,
            theme,
            event_type,
            start_date,
            end_date,
            ticket_price,
            total_tickets,
            payment_token,
            tiers: Vec::new(&env),
        };
        Self::create_event_with_tiers(env, params)
    }

    pub fn create_event_v2(env: Env, params: CreateEventParams) -> Result<u32, Error> {
        Self::create_event_with_tiers(env, params)
    }

    pub fn get_event(env: Env, event_id: u32) -> Result<Event, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)
    }

    pub fn get_archived_event(env: Env, event_id: u32) -> Option<ArchivedEvent> {
        env.storage()
            .persistent()
            .get(&DataKey::ArchivedEvent(event_id))
    }

    pub fn get_event_tiers(env: Env, event_id: u32) -> Result<Vec<TicketTier>, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::EventTiers(event_id))
            .ok_or(Error::EventNotFound)
    }

    pub fn get_event_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::EventCounter)
            .unwrap_or(0)
    }

    pub fn get_all_events(env: Env) -> Vec<Event> {
        let count = Self::get_event_count(env.clone());
        let mut events = Vec::new(&env);

        for event_id in 0..count {
            if let Some(event) = env.storage().persistent().get(&DataKey::Event(event_id)) {
                events.push_back(event);
            }
        }
        events
    }

    pub fn get_buyer_purchase(env: Env, event_id: u32, buyer: Address) -> Option<BuyerPurchase> {
        env.storage()
            .persistent()
            .get(&DataKey::BuyerPurchase(event_id, buyer))
    }

    pub fn cancel_event(env: Env, event_id: u32) -> Result<(), Error> {
        upg::require_not_paused(&env);

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        event.organizer.require_auth();

        if event.is_canceled {
            return Err(Error::EventAlreadyCanceled);
        }

        event.is_canceled = true;
        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        Self::extend_persistent_ttl(&env, &DataKey::Event(event_id));

        env.events()
            .publish((Symbol::new(&env, "event_canceled"),), event_id);

        let waitlist: Vec<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::Waitlist(event_id))
            .unwrap_or_else(|| Vec::new(&env));

        if !waitlist.is_empty() {
            env.events().publish(
                (Symbol::new(&env, "waitlist_cleared"),),
                (event_id, waitlist.len()),
            );
        }

        Self::decrement_organizer_open_events(&env, &event.organizer);

        Ok(())
    }

    pub fn claim_refund(env: Env, claimer: Address, event_id: u32) -> Result<(), Error> {
        upg::require_not_paused(&env);
        claimer.require_auth();

        let event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        if !event.is_canceled {
            return Err(Error::EventNotCanceled);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::RefundClaimed(event_id, claimer.clone()))
        {
            return Err(Error::RefundAlreadyClaimed);
        }

        let purchase: BuyerPurchase = env
            .storage()
            .persistent()
            .get(&DataKey::BuyerPurchase(event_id, claimer.clone()))
            .ok_or(Error::NotABuyer)?;

        env.storage()
            .persistent()
            .set(&DataKey::RefundClaimed(event_id, claimer.clone()), &true);
        Self::extend_persistent_ttl(&env, &DataKey::RefundClaimed(event_id, claimer.clone()));

        if purchase.total_paid > 0 {
            let token_client = soroban_sdk::token::Client::new(&env, &event.payment_token);
            token_client.transfer(
                &env.current_contract_address(),
                &claimer,
                &purchase.total_paid,
            );

            let balance_key = DataKey::EventBalance(event_id);
            let current_balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
            env.storage().persistent().set(
                &balance_key,
                &current_balance.saturating_sub(purchase.total_paid),
            );
            Self::extend_persistent_ttl(&env, &balance_key);
        }

        env.events().publish(
            (Symbol::new(&env, "refund_claimed"),),
            (event_id, claimer, purchase.quantity, purchase.total_paid),
        );

        Ok(())
    }

    pub fn purchase_ticket(
        env: Env,
        buyer: Address,
        event_id: u32,
        tier_index: u32,
    ) -> Result<(), Error> {
        Self::purchase_tickets(env, buyer, event_id, tier_index, 1)
    }

    pub fn purchase_tickets(
        env: Env,
        buyer: Address,
        event_id: u32,
        tier_index: u32,
        quantity: u128,
    ) -> Result<(), Error> {
        upg::require_not_paused(&env);
        buyer.require_auth();

        if quantity == 0 {
            return Err(Error::InvalidTicketCount);
        }
        if quantity > Self::MAX_PURCHASE_QUANTITY {
            return Err(Error::PurchaseQuantityTooLarge);
        }

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        if event.is_canceled {
            return Err(Error::EventAlreadyCanceled);
        }

        let mut tiers: Vec<TicketTier> = env
            .storage()
            .persistent()
            .get(&DataKey::EventTiers(event_id))
            .ok_or(Error::EventNotFound)?;

        if tier_index >= tiers.len() {
            return Err(Error::InvalidTierIndex);
        }

        let mut tier = tiers.get(tier_index).unwrap();

        if tier.sold_quantity + quantity > tier.total_quantity {
            return Err(Error::TierSoldOut);
        }

        let price_per_ticket = tier.price;
        let total_price = Self::calculate_total_price(price_per_ticket, quantity);

        if total_price > 0 {
            let token_client = soroban_sdk::token::Client::new(&env, &event.payment_token);
            token_client.transfer(&buyer, &env.current_contract_address(), &total_price);
        }

        for _ in 0..quantity {
            env.invoke_contract::<u128>(
                &event.ticket_nft_addr,
                &Symbol::new(&env, "mint_ticket_nft"),
                soroban_sdk::vec![&env, buyer.clone().into_val(&env)],
            );
        }

        tier.sold_quantity += quantity;
        tiers.set(tier_index, tier);
        env.storage()
            .persistent()
            .set(&DataKey::EventTiers(event_id), &tiers);
        Self::extend_persistent_ttl(&env, &DataKey::EventTiers(event_id));

        Self::record_purchase(&env, event_id, buyer.clone(), quantity, total_price);

        event.tickets_sold = event
            .tickets_sold
            .checked_add(quantity)
            .ok_or(Error::CounterOverflow)?;

        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        Self::extend_persistent_ttl(&env, &DataKey::Event(event_id));

        env.events().publish(
            (Symbol::new(&env, "ticket_purchased"),),
            (
                event_id,
                buyer,
                quantity,
                total_price,
                event.ticket_nft_addr,
                tier_index,
            ),
        );

        Ok(())
    }

    pub fn update_tickets_sold(env: Env, event_id: u32, amount: u128) -> Result<(), Error> {
        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        event.ticket_nft_addr.require_auth();

        event.tickets_sold = event
            .tickets_sold
            .checked_add(amount)
            .ok_or(Error::CounterOverflow)?;

        if event.tickets_sold > event.total_tickets {
            return Err(Error::CannotSellMoreTickets);
        }

        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        Self::extend_persistent_ttl(&env, &DataKey::Event(event_id));

        Ok(())
    }

    pub fn update_event(
        env: Env,
        event_id: u32,
        theme: Option<String>,
        ticket_price: Option<i128>,
        total_tickets: Option<u128>,
        start_date: Option<u64>,
        end_date: Option<u64>,
    ) -> Result<(), Error> {
        upg::require_not_paused(&env);

        let mut event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        event.organizer.require_auth();

        if event.is_canceled {
            return Err(Error::EventAlreadyCanceled);
        }

        let current_time = env.ledger().timestamp();

        if let Some(t) = theme {
            Self::validate_bounded_string(&t, Self::MAX_STRING_BYTES)?;
            event.theme = t;
        }

        if let Some(p) = ticket_price {
            if p < 0 {
                return Err(Error::NegativeTicketPrice);
            }
            Self::validate_ticket_price(p)?;
            event.ticket_price = p;
        }

        if let Some(t) = total_tickets {
            if t == 0 || t > Self::MAX_TICKETS_PER_EVENT {
                return Err(Error::InvalidTicketCount);
            }
            if t < event.tickets_sold {
                return Err(Error::TicketsBelowSold);
            }
            event.total_tickets = t;
        }

        let effective_end = end_date.unwrap_or(event.end_date);
        if let Some(s) = start_date {
            if s <= current_time {
                return Err(Error::InvalidStartDate);
            }
            if s >= effective_end {
                return Err(Error::InvalidEndDate);
            }
            Self::validate_event_span(s, effective_end)?;
            Self::validate_start_not_too_far(s, current_time)?;
            event.start_date = s;
        }

        let effective_start = start_date.unwrap_or(event.start_date);
        if let Some(e) = end_date {
            if e <= current_time || e <= effective_start {
                return Err(Error::InvalidEndDate);
            }
            if effective_start > current_time {
                Self::validate_event_span(effective_start, e)?;
                Self::validate_start_not_too_far(effective_start, current_time)?;
            }
            event.end_date = e;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        Self::extend_persistent_ttl(&env, &DataKey::Event(event_id));

        env.events().publish(
            (Symbol::new(&env, "event_updated"),),
            (event_id, event.organizer),
        );

        Ok(())
    }

    pub fn withdraw_funds(env: Env, event_id: u32) -> Result<(), Error> {
        upg::require_not_paused(&env);

        let event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        event.organizer.require_auth();

        if event.is_canceled {
            return Err(Error::EventAlreadyCanceled);
        }

        if env.ledger().timestamp() <= event.end_date {
            return Err(Error::EventNotEnded);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::FundsWithdrawn(event_id))
        {
            return Err(Error::FundsAlreadyWithdrawn);
        }

        env.storage()
            .persistent()
            .set(&DataKey::FundsWithdrawn(event_id), &true);
        Self::extend_persistent_ttl(&env, &DataKey::FundsWithdrawn(event_id));

        let balance_key = DataKey::EventBalance(event_id);
        let balance: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);

        if balance > 0 {
            let token_client = soroban_sdk::token::Client::new(&env, &event.payment_token);
            token_client.transfer(&env.current_contract_address(), &event.organizer, &balance);
            env.storage().persistent().set(&balance_key, &0i128);
            Self::extend_persistent_ttl(&env, &balance_key);
        }

        env.events().publish(
            (Symbol::new(&env, "funds_withdrawn"),),
            (event_id, event.organizer.clone(), balance),
        );

        Self::decrement_organizer_open_events(&env, &event.organizer);
        Self::try_promote_from_waitlist(&env, event_id);

        Ok(())
    }

    pub fn archive_event(env: Env, event_id: u32) -> Result<ArchivedEvent, Error> {
        upg::require_not_paused(&env);

        if env
            .storage()
            .persistent()
            .has(&DataKey::ArchivedEvent(event_id))
        {
            return Err(Error::AlreadyArchived);
        }

        let event: Event = env
            .storage()
            .persistent()
            .get(&DataKey::Event(event_id))
            .ok_or(Error::EventNotFound)?;

        event.organizer.require_auth();

        if event.is_canceled {
            return Err(Error::ArchiveNotAllowed);
        }

        let now = env.ledger().timestamp();
        if now <= event.end_date {
            return Err(Error::ArchiveNotAllowed);
        }

        if !env
            .storage()
            .persistent()
            .has(&DataKey::FundsWithdrawn(event_id))
        {
            return Err(Error::ArchiveNotAllowed);
        }

        let total_collected: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::EventBalance(event_id))
            .unwrap_or(0);

        let archived = ArchivedEvent {
            id: event.id,
            organizer: event.organizer,
            total_tickets: event.total_tickets,
            tickets_sold: event.tickets_sold,
            total_collected,
            is_canceled: event.is_canceled,
            archived_at: now,
        };

        env.storage()
            .persistent()
            .set(&DataKey::ArchivedEvent(event_id), &archived);
        Self::extend_persistent_ttl(&env, &DataKey::ArchivedEvent(event_id));

        if let Some(buyers) = env
            .storage()
            .persistent()
            .get::<_, Vec<Address>>(&DataKey::EventBuyers(event_id))
        {
            for buyer in buyers.iter() {
                env.storage()
                    .persistent()
                    .remove(&DataKey::BuyerPurchase(event_id, buyer.clone()));
                env.storage()
                    .persistent()
                    .remove(&DataKey::RefundClaimed(event_id, buyer));
            }
        }

        env.storage()
            .persistent()
            .remove(&DataKey::EventBuyers(event_id));
        env.storage()
            .persistent()
            .remove(&DataKey::EventTiers(event_id));
        env.storage()
            .persistent()
            .remove(&DataKey::Waitlist(event_id));
        env.storage()
            .persistent()
            .remove(&DataKey::EventBalance(event_id));
        env.storage()
            .persistent()
            .remove(&DataKey::FundsWithdrawn(event_id));
        env.storage().persistent().remove(&DataKey::Event(event_id));

        env.events()
            .publish((Symbol::new(&env, "event_archived"),), (event_id, now));

        Ok(archived)
    }

    pub fn schedule_upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        upg::schedule_upgrade(&env, new_wasm_hash);
    }

    pub fn cancel_upgrade(env: Env) {
        upg::cancel_upgrade(&env);
    }

    pub fn commit_upgrade(env: Env) {
        upg::commit_upgrade(&env);
    }

    pub fn pause(env: Env) {
        upg::pause(&env);
    }

    pub fn unpause(env: Env) {
        upg::unpause(&env);
    }

    pub fn transfer_admin(env: Env, new_admin: Address) {
        upg::transfer_admin(&env, new_admin);
    }

    pub fn version(env: Env) -> u32 {
        upg::get_version(&env)
    }

    fn validate_bounded_string(s: &String, max_bytes: u32) -> Result<(), Error> {
        if s.is_empty() || s.len() > max_bytes {
            return Err(Error::InvalidStringInput);
        }
        Ok(())
    }

    fn validate_ticket_price(price: i128) -> Result<(), Error> {
        if price < 0 {
            return Err(Error::NegativeTicketPrice);
        }
        if price > Self::MAX_TICKET_PRICE {
            return Err(Error::TicketPriceOutOfRange);
        }
        Ok(())
    }

    fn validate_create_schedule(env: &Env, start_date: u64, end_date: u64) -> Result<(), Error> {
        let now = env.ledger().timestamp();
        if start_date <= now {
            return Err(Error::InvalidStartDate);
        }
        if end_date <= start_date {
            return Err(Error::InvalidEndDate);
        }
        Self::validate_event_span(start_date, end_date)?;
        Self::validate_start_not_too_far(start_date, now)?;
        Ok(())
    }

    fn validate_event_span(start_date: u64, end_date: u64) -> Result<(), Error> {
        let span = end_date.saturating_sub(start_date);
        if span == 0 || span > Self::MAX_EVENT_DURATION_SECS {
            return Err(Error::EventScheduleOutOfRange);
        }
        Ok(())
    }

    fn validate_start_not_too_far(start_date: u64, now: u64) -> Result<(), Error> {
        let latest_start = now.saturating_add(Self::MAX_EVENT_START_AHEAD_SECS);
        if start_date > latest_start {
            return Err(Error::EventScheduleOutOfRange);
        }
        Ok(())
    }

    fn enforce_organizer_limits_and_rate(env: &Env, organizer: &Address) -> Result<(), Error> {
        let count_key = DataKey::OrganizerOpenEventCount(organizer.clone());
        let open_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        if open_count >= Self::MAX_ORGANIZER_OPEN_EVENTS {
            return Err(Error::TooManyOrganizerEvents);
        }

        if open_count > 0 {
            let ts_key = DataKey::OrganizerLastCreateTs(organizer.clone());
            let now = env.ledger().timestamp();
            if let Some(last) = env.storage().instance().get::<_, u64>(&ts_key) {
                let earliest = last.saturating_add(Self::EVENT_CREATE_COOLDOWN_SECS);
                if now < earliest {
                    return Err(Error::EventCreationRateLimited);
                }
            }
        }
        Ok(())
    }

    fn commit_organizer_create(env: &Env, organizer: &Address) {
        let count_key = DataKey::OrganizerOpenEventCount(organizer.clone());
        let open_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&count_key, &open_count.saturating_add(1));
        Self::extend_persistent_ttl(env, &count_key);

        let ts_key = DataKey::OrganizerLastCreateTs(organizer.clone());
        env.storage()
            .instance()
            .set(&ts_key, &env.ledger().timestamp());
        upg::extend_instance_ttl(env);
    }

    fn decrement_organizer_open_events(env: &Env, organizer: &Address) {
        let count_key = DataKey::OrganizerOpenEventCount(organizer.clone());
        let open_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&count_key, &open_count.saturating_sub(1));
        Self::extend_persistent_ttl(env, &count_key);
    }

    fn try_promote_from_waitlist(env: &Env, event_id: u32) {
        let waitlist_key = DataKey::Waitlist(event_id);
        let waitlist: Vec<Address> = env
            .storage()
            .persistent()
            .get(&waitlist_key)
            .unwrap_or_else(|| Vec::new(env));

        if waitlist.is_empty() {
            return;
        }

        let promoted = waitlist.get(0).unwrap();

        let mut remaining = Vec::new(env);
        for (i, addr) in waitlist.iter().enumerate() {
            if i > 0 {
                remaining.push_back(addr);
            }
        }
        env.storage().persistent().set(&waitlist_key, &remaining);
        Self::extend_persistent_ttl(env, &waitlist_key);

        env.events().publish(
            (Symbol::new(env, "waitlist_promoted"),),
            (event_id, promoted),
        );
    }

    fn get_and_increment_counter(env: &Env) -> Result<u32, Error> {
        let current: u32 = env
            .storage()
            .instance()
            .get(&DataKey::EventCounter)
            .unwrap_or(0);
        let next = current.checked_add(1).ok_or(Error::CounterOverflow)?;
        env.storage().instance().set(&DataKey::EventCounter, &next);
        upg::extend_instance_ttl(env);
        Ok(current)
    }

    fn deploy_ticket_nft(env: &Env, event_id: u32) -> Result<Address, Error> {
        let factory_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::TicketFactory)
            .ok_or(Error::FactoryNotInitialized)?;

        let mut salt_bytes = [0u8; 32];
        let id_bytes = event_id.to_be_bytes();
        salt_bytes[..4].copy_from_slice(&id_bytes);
        let salt = BytesN::from_array(env, &salt_bytes);

        let nft_addr: Address = env.invoke_contract(
            &factory_addr,
            &Symbol::new(env, "deploy_ticket"),
            soroban_sdk::vec![env, env.current_contract_address().to_val(), salt.to_val(),],
        );

        Ok(nft_addr)
    }

    fn record_purchase(env: &Env, event_id: u32, buyer: Address, quantity: u128, total_paid: i128) {
        let key = DataKey::BuyerPurchase(event_id, buyer.clone());
        let existing = env.storage().persistent().get::<_, BuyerPurchase>(&key);

        if let Some(mut purchase) = existing {
            purchase.quantity = purchase
                .quantity
                .checked_add(quantity)
                .unwrap_or_else(|| panic!("Purchase quantity overflow"));
            purchase.total_paid = purchase
                .total_paid
                .checked_add(total_paid)
                .unwrap_or_else(|| panic!("Purchase total overflow"));
            env.storage().persistent().set(&key, &purchase);
        } else {
            let purchase = BuyerPurchase {
                quantity,
                total_paid,
            };
            env.storage().persistent().set(&key, &purchase);

            let buyers_key = DataKey::EventBuyers(event_id);
            let mut buyers: Vec<Address> = env
                .storage()
                .persistent()
                .get(&buyers_key)
                .unwrap_or_else(|| Vec::new(env));
            buyers.push_back(buyer);
            env.storage().persistent().set(&buyers_key, &buyers);
            Self::extend_persistent_ttl(env, &buyers_key);
        }

        if total_paid > 0 {
            let balance_key = DataKey::EventBalance(event_id);
            let current: i128 = env.storage().persistent().get(&balance_key).unwrap_or(0);
            env.storage()
                .persistent()
                .set(&balance_key, &current.saturating_add(total_paid));
            Self::extend_persistent_ttl(env, &balance_key);
        }

        Self::extend_persistent_ttl(env, &key);
    }

    fn calculate_total_price(ticket_price: i128, quantity: u128) -> i128 {
        if ticket_price <= 0 {
            return 0;
        }
        let quantity_i128 =
            i128::try_from(quantity).unwrap_or_else(|_| panic!("Quantity exceeds pricing range"));
        let subtotal = ticket_price
            .checked_mul(quantity_i128)
            .unwrap_or_else(|| panic!("Price overflow"));

        let discount_bps = if quantity >= 10 {
            1_000i128
        } else if quantity >= 5 {
            500i128
        } else {
            0i128
        };

        subtotal
            .checked_mul(10_000i128 - discount_bps)
            .and_then(|value| value.checked_div(10_000))
            .unwrap_or_else(|| panic!("Discount calculation overflow"))
    }

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        upg::extend_persistent_ttl(env, key);
    }
}

#[cfg(test)]
mod fuzz;
#[cfg(test)]
mod test;
