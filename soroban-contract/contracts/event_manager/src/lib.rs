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
    ArithmeticOverflow = 30,
}

// STORAGE: pack rate-limit metadata (open_count + last_create_ts) into a
// single per-organizer entry. Before: two persistent keys
// (`OrganizerOpenEventCount`, `OrganizerLastCreateTs`), each touched on
// `create_event` and `cancel_event`/`withdraw_funds`. After: one entry.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OrganizerLimits {
    pub open_count: u32,
    pub last_create_ts: u64,
}

// STORAGE: pack the per-event funds book (collected balance + withdrawn
// flag) into one entry. Before: two persistent keys (`EventBalance`,
// `FundsWithdrawn`). After: one entry, and the missing-entry case still
// represents "no funds collected, not withdrawn" so the read path is
// backwards-compatible.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventLedger {
    pub balance: i128,
    pub withdrawn: bool,
}

/// Packed POAP + TBA integration config (one instance read in `distribute_poaps`).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoapIntegration {
    pub tba_registry: Address,
    pub tba_implementation_hash: BytesN<32>,
    pub tba_salt: BytesN<32>,
    pub poap_nft: Address,
}

#[contracttype]
pub enum DataKey {
    Event(u32),
    ArchivedEvent(u32),
    EventCounter,
    TicketFactory,
    /// POAP distribution + deterministic TBA resolution (packed).
    PoapIntegration,
    RefundClaimed(u32, Address),
    EventBuyers(u32),
    EventTiers(u32),
    BuyerPurchase(u32, Address),
    BuyerTicketTokenId(u32, Address),
    /// STORAGE: lives in `temporary` storage — only consulted between event
    /// open and end_date. Once the event closes the waitlist is no longer
    /// queried, so paying persistent rent is wasted.
    Waitlist(u32),
    /// STORAGE: packed funds book (was `EventBalance` + `FundsWithdrawn`).
    EventLedger(u32),
    /// STORAGE: packed rate-limit metadata (was `OrganizerOpenEventCount`
    /// + `OrganizerLastCreateTs`).
    OrganizerLimits(Address),
    /// STORAGE: lives in `temporary` storage — written between event end
    /// and `distribute_poaps`, then never read again (the `PoapDistributed`
    /// guard short-circuits any further work).
    Attendance(u32, Address),
    /// STORAGE: lives in `temporary` storage — same lifecycle as
    /// `Attendance`. The list is consumed once during `distribute_poaps`.
    Attendees(u32),
    PoapDistributed(u32),
    DefaultPoapMetadata(u32),
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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventCreatedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub organizer: Address,
    pub ticket_nft_addr: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct WaitlistClearedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub waitlist_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RefundClaimedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub claimer: Address,
    pub quantity: u128,
    pub total_paid: i128,
}

/// Per-attendee POAP metadata sent over the wire to the POAP NFT contract's
/// `mint_poap` entry point. Field shape must match `poap_nft::PoapMetadata`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketPurchasedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub buyer: Address,
    pub quantity: u128,
    pub total_price: i128,
    pub ticket_nft_addr: Address,
    pub tier_index: u32,
}

/// Per-attendee POAP metadata sent over the wire to the POAP NFT contract's
/// `mint_poap` entry point. Field shape must match `poap_nft::PoapMetadata`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventUpdatedEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub organizer: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FundsWithdrawnEvent {
    pub contract_address: Address,
    pub event_id: u32,
    pub organizer: Address,
    pub amount: i128,
}

/// POAP badge template stored on the event manager and used as the source of
/// truth when minting per-attendee POAPs in [`EventManager::distribute_poaps`].
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoapBadgeMetadata {
    pub name: String,
    pub description: String,
    pub image: String,
}

/// Per-attendee POAP metadata sent over the wire to the POAP NFT contract's
/// `mint_poap` entry point. Field shape must match `poap_nft::PoapMetadata`.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoapMintMetadata {
    pub event_id: u32,
    pub name: String,
    pub description: String,
    pub image: String,
    pub issued_at: u64,
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

    /// Configure POAP + TBA integration (optional, can be called anytime by admin).
    ///
    /// - `tba_registry`: used to resolve the deterministic ticket TBA for a ticket token_id
    /// - `tba_implementation_hash`: passed through to `tba_registry.get_account(...)`
    /// - `tba_salt`: passed through to `tba_registry.get_account(...)`
    /// - `poap_nft`: POAP contract address (minter should be this EventManager)
    pub fn configure_poap(
        env: Env,
        tba_registry: Address,
        tba_implementation_hash: BytesN<32>,
        tba_salt: BytesN<32>,
        poap_nft: Address,
    ) -> Result<(), Error> {
        upg::require_admin(&env);

        let cfg = PoapIntegration {
            tba_registry,
            tba_implementation_hash,
            tba_salt,
            poap_nft,
        };
        env.storage()
            .instance()
            .set(&DataKey::PoapIntegration, &cfg);
        upg::extend_instance_ttl(&env);
        Ok(())
    }

    /// Set default POAP metadata template for an event.
    pub fn set_default_poap_metadata(
        env: Env,
        event_id: u32,
        metadata: PoapBadgeMetadata,
    ) -> Result<(), Error> {
        upg::require_not_paused(&env);
        let event: Event = Self::get_event(env.clone(), event_id)?;
        event.organizer.require_auth();

        env.storage()
            .persistent()
            .set(&DataKey::DefaultPoapMetadata(event_id), &metadata);
        Self::extend_persistent_ttl(&env, &DataKey::DefaultPoapMetadata(event_id));
        Ok(())
    }

    /// Mark attendance for a buyer (ticket holder).
    ///
    /// - Must be called by the event organizer.
    /// - Verifies the buyer currently holds the event ticket NFT.
    pub fn mark_attendance(env: Env, event_id: u32, buyer: Address) -> Result<(), Error> {
        upg::require_not_paused(&env);
        let event: Event = Self::get_event(env.clone(), event_id)?;
        event.organizer.require_auth();

        // Verify buyer currently holds a ticket.
        let bal: u128 = env.invoke_contract(
            &event.ticket_nft_addr,
            &Symbol::new(&env, "balance_of"),
            soroban_sdk::vec![&env, buyer.clone().into_val(&env)],
        );
        if bal == 0 {
            return Err(Error::NotABuyer);
        }

        // STORAGE: attendance + attendee list live in `temporary` storage —
        // they are consumed exactly once during `distribute_poaps` and then
        // never read again, so persistent rent would be wasted.
        let attend_key = DataKey::Attendance(event_id, buyer.clone());
        if env.storage().temporary().has(&attend_key) {
            return Ok(());
        }

        env.storage().temporary().set(&attend_key, &true);

        let list_key = DataKey::Attendees(event_id);
        let mut attendees: Vec<Address> = env
            .storage()
            .temporary()
            .get(&list_key)
            .unwrap_or_else(|| Vec::new(&env));
        attendees.push_back(buyer.clone());
        env.storage().temporary().set(&list_key, &attendees);

        env.events()
            .publish((Symbol::new(&env, "attendance_marked"),), (event_id, buyer));
        Ok(())
    }

    /// Batch distribute POAPs after the event ends.
    ///
    /// - Called by the event organizer.
    /// - Mints POAPs to the ticket TBA (deterministic) for each attendee.
    pub fn distribute_poaps(env: Env, event_id: u32) -> Result<u32, Error> {
        upg::require_not_paused(&env);
        let event: Event = Self::get_event(env.clone(), event_id)?;
        event.organizer.require_auth();

        if env.ledger().timestamp() <= event.end_date {
            return Err(Error::EventNotEnded);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::PoapDistributed(event_id))
        {
            return Ok(0);
        }

        let cfg: PoapIntegration = env
            .storage()
            .instance()
            .get(&DataKey::PoapIntegration)
            .ok_or(Error::FactoryNotInitialized)?;

        // STORAGE: attendees list lives in `temporary` storage (see
        // `mark_attendance`).
        let attendees: Vec<Address> = env
            .storage()
            .temporary()
            .get(&DataKey::Attendees(event_id))
            .unwrap_or_else(|| Vec::new(&env));

        let badge_md: PoapBadgeMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::DefaultPoapMetadata(event_id))
            .unwrap_or(PoapBadgeMetadata {
                name: String::from_str(&env, "POAP"),
                description: String::from_str(&env, "Proof of Attendance"),
                image: String::from_str(&env, ""),
            });

        let mut minted: u32 = 0;
        for attendee in attendees.iter() {
            let token_id: u128 = env
                .storage()
                .persistent()
                .get(&DataKey::BuyerTicketTokenId(event_id, attendee.clone()))
                .unwrap_or(0u128);
            if token_id == 0 {
                continue;
            }

            // Resolve deterministic ticket TBA.
            let tba_addr: Address = env.invoke_contract(
                &cfg.tba_registry,
                &Symbol::new(&env, "get_account"),
                soroban_sdk::vec![
                    &env,
                    cfg.tba_implementation_hash.clone().into_val(&env),
                    event.ticket_nft_addr.clone().into_val(&env),
                    token_id.into_val(&env),
                    cfg.tba_salt.clone().into_val(&env),
                ],
            );

            // Mint POAP NFT to the ticket TBA.
            let poap_md = PoapMintMetadata {
                event_id,
                name: badge_md.name.clone(),
                description: badge_md.description.clone(),
                image: badge_md.image.clone(),
                issued_at: env.ledger().timestamp(),
            };
            env.invoke_contract::<u128>(
                &cfg.poap_nft,
                &Symbol::new(&env, "mint_poap"),
                soroban_sdk::vec![&env, tba_addr.into_val(&env), poap_md.into_val(&env),],
            );
            minted = minted.saturating_add(1);
        }

        env.storage()
            .persistent()
            .set(&DataKey::PoapDistributed(event_id), &true);
        Self::extend_persistent_ttl(&env, &DataKey::PoapDistributed(event_id));

        env.events().publish(
            (Symbol::new(&env, "poaps_distributed"),),
            (event_id, minted),
        );

        Ok(minted)
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

        let event = EventCreatedEvent {
            contract_address: env.current_contract_address(),
            event_id,
            organizer: params.organizer.clone(),
            ticket_nft_addr,
        };
        env.events()
            .publish((Symbol::new(&env, "EventCreated"),), event);

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

        // STORAGE: waitlist lives in `temporary` storage — only relevant
        // between event open and end_date; once the event resolves the
        // waitlist isn't consulted again, so persistent rent is wasted.
        let waitlist: Vec<Address> = env
            .storage()
            .temporary()
            .get(&DataKey::Waitlist(event_id))
            .unwrap_or_else(|| Vec::new(&env));

        if !waitlist.is_empty() {
            let event = WaitlistClearedEvent {
                contract_address: env.current_contract_address(),
                event_id,
                waitlist_count: waitlist.len() as u32,
            };
            env.events()
                .publish((Symbol::new(&env, "WaitlistCleared"),), event);
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

            // STORAGE: read packed ledger, decrement balance, write back.
            let ledger_key = DataKey::EventLedger(event_id);
            let mut ledger: EventLedger = env
                .storage()
                .persistent()
                .get(&ledger_key)
                .unwrap_or(EventLedger {
                    balance: 0,
                    withdrawn: false,
                });
            ledger.balance = ledger.balance.saturating_sub(purchase.total_paid);
            env.storage().persistent().set(&ledger_key, &ledger);
            Self::extend_persistent_ttl(&env, &ledger_key);
        }

        let event = RefundClaimedEvent {
            contract_address: env.current_contract_address(),
            event_id,
            claimer: claimer.clone(),
            quantity: purchase.quantity,
            total_paid: purchase.total_paid,
        };
        env.events()
            .publish((Symbol::new(&env, "RefundClaimed"),), event);

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
        let total_price = Self::calculate_total_price(price_per_ticket, quantity)?;

        if total_price > 0 {
            let token_client = soroban_sdk::token::Client::new(&env, &event.payment_token);
            token_client.transfer(&buyer, &env.current_contract_address(), &total_price);
        }

        for _ in 0..quantity {
            let minted_token_id: u128 = env.invoke_contract(
                &event.ticket_nft_addr,
                &Symbol::new(&env, "mint_ticket_nft"),
                soroban_sdk::vec![&env, buyer.clone().into_val(&env)],
            );
            env.storage().persistent().set(
                &DataKey::BuyerTicketTokenId(event_id, buyer.clone()),
                &minted_token_id,
            );
            Self::extend_persistent_ttl(
                &env,
                &DataKey::BuyerTicketTokenId(event_id, buyer.clone()),
            );
        }

        tier.sold_quantity += quantity;
        tiers.set(tier_index, tier);
        env.storage()
            .persistent()
            .set(&DataKey::EventTiers(event_id), &tiers);
        Self::extend_persistent_ttl(&env, &DataKey::EventTiers(event_id));

        Self::record_purchase(&env, event_id, buyer.clone(), quantity, total_price)?;

        event.tickets_sold = event
            .tickets_sold
            .checked_add(quantity)
            .ok_or(Error::CounterOverflow)?;

        env.storage()
            .persistent()
            .set(&DataKey::Event(event_id), &event);
        Self::extend_persistent_ttl(&env, &DataKey::Event(event_id));

        let event_data = TicketPurchasedEvent {
            contract_address: env.current_contract_address(),
            event_id,
            buyer: buyer.clone(),
            quantity,
            total_price,
            ticket_nft_addr: event.ticket_nft_addr,
            tier_index,
        };
        env.events()
            .publish((Symbol::new(&env, "TicketPurchased"),), event_data);

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

        let event_data = EventUpdatedEvent {
            contract_address: env.current_contract_address(),
            event_id,
            organizer: event.organizer,
        };
        env.events()
            .publish((Symbol::new(&env, "EventUpdated"),), event_data);

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

        // STORAGE: read packed ledger once, mutate both fields, write back.
        // Replaces the prior pair of (FundsWithdrawn, EventBalance) entries.
        let ledger_key = DataKey::EventLedger(event_id);
        let mut ledger: EventLedger =
            env.storage()
                .persistent()
                .get(&ledger_key)
                .unwrap_or(EventLedger {
                    balance: 0,
                    withdrawn: false,
                });

        if ledger.withdrawn {
            return Err(Error::FundsAlreadyWithdrawn);
        }

        let balance = ledger.balance;
        if balance > 0 {
            let token_client = soroban_sdk::token::Client::new(&env, &event.payment_token);
            token_client.transfer(&env.current_contract_address(), &event.organizer, &balance);
            ledger.balance = 0;
        }
        ledger.withdrawn = true;

        env.storage().persistent().set(&ledger_key, &ledger);
        Self::extend_persistent_ttl(&env, &ledger_key);

        let event_data = FundsWithdrawnEvent {
            contract_address: env.current_contract_address(),
            event_id,
            organizer: event.organizer.clone(),
            amount: balance,
        };
        env.events()
            .publish((Symbol::new(&env, "FundsWithdrawn"),), event_data);

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

        // STORAGE: read packed ledger once for both checks (withdrawn? &
        // total_collected for the archive snapshot).
        let ledger: EventLedger = env
            .storage()
            .persistent()
            .get(&DataKey::EventLedger(event_id))
            .unwrap_or(EventLedger {
                balance: 0,
                withdrawn: false,
            });

        if !ledger.withdrawn {
            return Err(Error::ArchiveNotAllowed);
        }

        let total_collected: i128 = ledger.balance;

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
        // STORAGE: Waitlist lives in `temporary` storage now.
        env.storage()
            .temporary()
            .remove(&DataKey::Waitlist(event_id));
        // STORAGE: single packed ledger replaces (EventBalance, FundsWithdrawn).
        env.storage()
            .persistent()
            .remove(&DataKey::EventLedger(event_id));
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

    /// Immediate (fast-path) upgrade. Admin-only, no timelock — see
    /// `upgradeable::upgrade` for the full security note. Reserve for
    /// emergencies; prefer `schedule_upgrade` + `commit_upgrade` for
    /// routine upgrades.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        upg::upgrade(&env, new_wasm_hash);
    }

    /// Apply post-upgrade state-shape migrations and bump the version to
    /// `target_version`. Admin-only; rejects downgrades.
    pub fn migrate(env: Env, target_version: u32) {
        upg::require_admin(&env);
        upg::require_version_increase(&env, target_version);

        match target_version {
            _ => {}
        }

        upg::migration_completed(&env, target_version);
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
        // STORAGE: a single packed read covers both the open-event count and
        // the create-cooldown timestamp.
        let limits_key = DataKey::OrganizerLimits(organizer.clone());
        let limits: OrganizerLimits = env
            .storage()
            .persistent()
            .get(&limits_key)
            .unwrap_or(OrganizerLimits {
                open_count: 0,
                last_create_ts: 0,
            });
        if limits.open_count >= Self::MAX_ORGANIZER_OPEN_EVENTS {
            return Err(Error::TooManyOrganizerEvents);
        }

        if limits.open_count > 0 {
            let now = env.ledger().timestamp();
            let earliest = limits
                .last_create_ts
                .saturating_add(Self::EVENT_CREATE_COOLDOWN_SECS);
            if now < earliest {
                return Err(Error::EventCreationRateLimited);
            }
        }
        Ok(())
    }

    fn commit_organizer_create(env: &Env, organizer: &Address) {
        // STORAGE: read packed limits once, mutate both fields, write back.
        let limits_key = DataKey::OrganizerLimits(organizer.clone());
        let mut limits: OrganizerLimits = env
            .storage()
            .persistent()
            .get(&limits_key)
            .unwrap_or(OrganizerLimits {
                open_count: 0,
                last_create_ts: 0,
            });
        limits.open_count = limits.open_count.saturating_add(1);
        limits.last_create_ts = env.ledger().timestamp();
        env.storage().persistent().set(&limits_key, &limits);
        Self::extend_persistent_ttl(env, &limits_key);
    }

    fn decrement_organizer_open_events(env: &Env, organizer: &Address) {
        // STORAGE: same packed entry — keep last_create_ts unchanged so the
        // rate-limit window from the previous create still applies.
        let limits_key = DataKey::OrganizerLimits(organizer.clone());
        let mut limits: OrganizerLimits = env
            .storage()
            .persistent()
            .get(&limits_key)
            .unwrap_or(OrganizerLimits {
                open_count: 0,
                last_create_ts: 0,
            });
        limits.open_count = limits.open_count.saturating_sub(1);
        env.storage().persistent().set(&limits_key, &limits);
        Self::extend_persistent_ttl(env, &limits_key);
    }

    fn try_promote_from_waitlist(env: &Env, event_id: u32) {
        // STORAGE: waitlist lives in `temporary` — see DataKey definition.
        // No TTL extension on the read path; the write side (whichever
        // contract hands signups in here) is responsible for keeping the
        // entry alive while it matters.
        let key = DataKey::Waitlist(event_id);
        if let Some(waitlist) = env.storage().temporary().get::<_, Vec<Address>>(&key) {
            if !waitlist.is_empty() {
                env.events().publish(
                    (Symbol::new(env, "waitlist_promotion_skipped"),),
                    (event_id, waitlist.len()),
                );
            }
        }
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

    fn record_purchase(env: &Env, event_id: u32, buyer: Address, quantity: u128, total_paid: i128) -> Result<(), Error> {
        let key = DataKey::BuyerPurchase(event_id, buyer.clone());
        let existing = env.storage().persistent().get::<_, BuyerPurchase>(&key);

        if let Some(mut purchase) = existing {
            purchase.quantity = purchase
                .quantity
                .checked_add(quantity)
                .ok_or(Error::ArithmeticOverflow)?;
            purchase.total_paid = purchase
                .total_paid
                .checked_add(total_paid)
                .ok_or(Error::ArithmeticOverflow)?;
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
            // STORAGE: read packed ledger, increment balance, write back.
            let ledger_key = DataKey::EventLedger(event_id);
            let mut ledger: EventLedger = env
                .storage()
                .persistent()
                .get(&ledger_key)
                .unwrap_or(EventLedger {
                    balance: 0,
                    withdrawn: false,
                });
            ledger.balance = ledger.balance.saturating_add(total_paid);
            env.storage().persistent().set(&ledger_key, &ledger);
            Self::extend_persistent_ttl(env, &ledger_key);
        }

        Self::extend_persistent_ttl(env, &key);
        Ok(())
    }

    fn calculate_total_price(ticket_price: i128, quantity: u128) -> Result<i128, Error> {
        if ticket_price <= 0 {
            return Ok(0);
        }
        let quantity_i128 =
            i128::try_from(quantity).map_err(|_| Error::ArithmeticOverflow)?;
        let subtotal = ticket_price
            .checked_mul(quantity_i128)
            .ok_or(Error::ArithmeticOverflow)?;

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
            .ok_or(Error::ArithmeticOverflow)
    }

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        upg::extend_persistent_ttl(env, key);
    }
}

#[cfg(test)]
mod fuzz;
#[cfg(test)]
mod test;
