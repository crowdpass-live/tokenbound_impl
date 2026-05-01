#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, BytesN, Env, Symbol, Vec,
};

use upgradeable as upg;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum MarketplaceError {
    ListingNotFound = 1,
    ListingNotActive = 2,
    CannotPurchaseOwnListing = 3,
    PaymentTokenNotConfigured = 4,
    OnlySellerCanCancel = 5,
    ListingAlreadyInactive = 6,
    PriceMustBePositive = 7,
    InsufficientBalance = 8,
    Unauthorized = 9,
    InvalidRoyaltyPercentage = 10,
    RoyaltyConfigNotFound = 11,
    RoyaltyRecipientsExceeded = 12,
    SellerNotTicketOwner = 13,
    MarketStatsNotInitialized = 14,
    PriceCapNotSet = 15,
}

#[derive(Clone)]
#[contracttype]
pub struct Listing {
    pub seller: Address,
    pub ticket_contract: Address,
    pub token_id: i128,
    pub price: i128,
    pub active: bool,
    pub created_at: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct Sale {
    pub buyer: Address,
    pub seller: Address,
    pub ticket_contract: Address,
    pub token_id: i128,
    pub price: i128,
    pub timestamp: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct PriceCap {
    pub max_price_multiplier: i128,
    pub min_price_multiplier: i128,
    pub active: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct RoyaltyRecipient {
    pub recipient: Address,
    pub percentage: u32, // Percentage in basis points (1/10000), max 10000 = 100%
}

#[derive(Clone)]
#[contracttype]
pub struct RoyaltyConfig {
    pub recipients: Vec<RoyaltyRecipient>,
    pub total_percentage: u32, // Sum of all percentages in basis points
    pub active: bool,
}

// STORAGE: pack the three frequently-read singleton counters into one packed
// instance entry. Before: 3 separate persistent keys (TotalListings,
// TotalSales, MaxListingsPerUser), each paying its own rent and TTL bumps on
// every listing/purchase. After: 1 instance entry that rides the contract
// instance TTL and is read/written once per state-mutating call.
#[derive(Clone)]
#[contracttype]
pub struct MarketStats {
    pub total_listings: u32,
    pub total_sales: u32,
    pub max_listings_per_user: u32,
}

// STORAGE: per-listing / per-sale records stay `persistent` (long-lived,
// per-id history). Singleton config — Stats, PriceCap, Admin,
// MaxRoyaltyRecipients — moves to `instance` (cheapest hot config tier).
// RoyaltyConfig stays `persistent` for now: it can be large (recipient list)
// and is updated infrequently, so instance bloat would penalise every read.
#[contracttype]
pub enum DataKey {
    Listing(u32),
    Sale(u32),
    Stats,
    PriceCap,
    Admin,
    RoyaltyConfig,
    MaxRoyaltyRecipients,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ListingCreatedEvent {
    pub contract_address: Address,
    pub listing_id: u32,
    pub seller: Address,
    pub ticket_contract: Address,
    pub token_id: i128,
    pub price: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PurchaseCompletedEvent {
    pub contract_address: Address,
    pub listing_id: u32,
    pub buyer: Address,
    pub seller: Address,
    pub price: i128,
}

#[contract]
pub struct MarketplaceContract;

#[contractimpl]
impl MarketplaceContract {
    pub fn __constructor(
        env: Env,
        admin: Address,
        max_price_multiplier: i128,
        min_price_multiplier: i128,
    ) {
        admin.require_auth();

        upg::set_admin(&env, &admin);
        upg::init_version(&env);

        let price_cap = PriceCap {
            max_price_multiplier,
            min_price_multiplier,
            active: true,
        };

        // STORAGE: write singleton config to `instance` (rides the contract
        // instance TTL; one extension call covers them all). Pack the three
        // counters into a single `MarketStats` entry — was 3 persistent keys.
        let stats = MarketStats {
            total_listings: 0,
            total_sales: 0,
            max_listings_per_user: 10,
        };
        env.storage().instance().set(&DataKey::PriceCap, &price_cap);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Stats, &stats);
        env.storage()
            .instance()
            .set(&DataKey::MaxRoyaltyRecipients, &10u32);
        upg::extend_instance_ttl(&env);
    }

    pub fn create_listing(
        env: Env,
        seller: Address,
        ticket_contract: Address,
        token_id: i128,
        price: i128,
    ) -> Result<u32, MarketplaceError> {
        upg::require_not_paused(&env);
        seller.require_auth();

        // Verify seller owns the ticket by checking balance
        let token_client = token::Client::new(&env, &ticket_contract);
        let balance = token_client.balance(&seller);
        if balance <= 0 {
            return Err(MarketplaceError::SellerNotTicketOwner);
        }

        // STORAGE: PriceCap and Stats live in `instance` storage — cheap reads.
        let price_cap: PriceCap = env
            .storage()
            .instance()
            .get(&DataKey::PriceCap)
            .ok_or(MarketplaceError::PriceCapNotSet)?;

        if price_cap.active && price <= 0 {
            return Err(MarketplaceError::PriceMustBePositive);
        }

        let mut stats: MarketStats = env
            .storage()
            .instance()
            .get(&DataKey::Stats)
            .ok_or(MarketplaceError::MarketStatsNotInitialized)?;
        let listing_id = stats.total_listings;

        let listing = Listing {
            seller: seller.clone(),
            ticket_contract: ticket_contract.clone(),
            token_id,
            price,
            active: true,
            created_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        stats.total_listings = stats.total_listings.checked_add(1).unwrap();
        env.storage().instance().set(&DataKey::Stats, &stats);
        Self::extend_persistent_ttl(&env, &DataKey::Listing(listing_id));
        upg::extend_instance_ttl(&env);

        let event = ListingCreatedEvent {
            contract_address: env.current_contract_address(),
            listing_id,
            seller: seller.clone(),
            ticket_contract: ticket_contract.clone(),
            token_id,
            price,
        };
        env.events()
            .publish((Symbol::new(&env, "ListingCreated"),), event);

        Ok(listing_id)
    }

    pub fn purchase_ticket(
        env: Env,
        buyer: Address,
        listing_id: u32,
    ) -> Result<(), MarketplaceError> {
        upg::require_not_paused(&env);
        buyer.require_auth();

        let listing: Listing = match env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
        {
            Some(l) => l,
            None => return Err(MarketplaceError::ListingNotFound),
        };

        if !listing.active {
            return Err(MarketplaceError::ListingNotActive);
        }

        if listing.seller == buyer {
            return Err(MarketplaceError::CannotPurchaseOwnListing);
        }

        // STORAGE: Admin moved to `instance` storage (singleton config).
        // The legacy "admin doubles as payment token" semantics are preserved
        // verbatim — only the storage tier changed.
        let payment_token = match env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Admin)
        {
            Some(addr) => addr,
            None => return Err(MarketplaceError::PaymentTokenNotConfigured),
        };

        let token_client = token::Client::new(&env, &payment_token);

        // Check if royalty config exists and is active
        let royalty_config: Option<RoyaltyConfig> =
            env.storage().persistent().get(&DataKey::RoyaltyConfig);
        let seller_receives = if let Some(ref config) = royalty_config {
            if config.active {
                // Calculate and distribute royalties
                let mut seller_amount = listing.price;

                for recipient in config.recipients.iter() {
                    // Calculate royalty amount: (price * percentage) / 10000
                    let royalty_amount = listing
                        .price
                        .checked_mul(recipient.percentage as i128)
                        .ok_or(MarketplaceError::InvalidRoyaltyPercentage)?
                        / 10000;

                    if royalty_amount > 0 {
                        token_client.transfer(&buyer, &recipient.recipient, &royalty_amount);
                        seller_amount = seller_amount
                            .checked_sub(royalty_amount)
                            .ok_or(MarketplaceError::InsufficientBalance)?;

                        env.events().publish(
                            ("royalty_paid",),
                            (
                                listing_id,
                                recipient.recipient.clone(),
                                recipient.percentage,
                                royalty_amount,
                            ),
                        );
                    }
                }

                seller_amount
            } else {
                // Royalty config is inactive, seller gets full amount
                listing.price
            }
        } else {
            // No royalty config, seller gets full amount
            listing.price
        };

        // Transfer remaining payment to seller
        if seller_receives > 0 {
            token_client.transfer(&buyer, &listing.seller, &seller_receives);
        }

        // Transfer ticket NFT
        let ticket_client = token::Client::new(&env, &listing.ticket_contract);

        // Transfer from seller to buyer (spender is the marketplace contract itself)
        ticket_client.transfer_from(
            &env.current_contract_address(),
            &listing.seller,
            &buyer,
            &listing.token_id,
        );

        // Mark listing as inactive
        let mut updated_listing = listing.clone();
        updated_listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &updated_listing);
        Self::extend_persistent_ttl(&env, &DataKey::Listing(listing_id));

        // STORAGE: read packed Stats once, increment sales counter, write back.
        let mut stats: MarketStats = env
            .storage()
            .instance()
            .get(&DataKey::Stats)
            .ok_or(MarketplaceError::MarketStatsNotInitialized)?;
        let total_sales = stats.total_sales;
        let sale = Sale {
            buyer: buyer.clone(),
            seller: listing.seller.clone(),
            ticket_contract: listing.ticket_contract,
            token_id: listing.token_id,
            price: listing.price,
            timestamp: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Sale(total_sales), &sale);
        stats.total_sales = stats.total_sales.checked_add(1).unwrap();
        env.storage().instance().set(&DataKey::Stats, &stats);
        Self::extend_persistent_ttl(&env, &DataKey::Sale(total_sales));
        upg::extend_instance_ttl(&env);

        let event = PurchaseCompletedEvent {
            contract_address: env.current_contract_address(),
            listing_id,
            buyer: buyer.clone(),
            seller: listing.seller.clone(),
            price: listing.price,
        };
        env.events()
            .publish((Symbol::new(&env, "PurchaseCompleted"),), event);

        Ok(())
    }

    pub fn cancel_listing(
        env: Env,
        seller: Address,
        listing_id: u32,
    ) -> Result<(), MarketplaceError> {
        seller.require_auth();

        let mut listing: Listing = match env
            .storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
        {
            Some(l) => l,
            None => return Err(MarketplaceError::ListingNotFound),
        };

        if listing.seller != seller {
            return Err(MarketplaceError::OnlySellerCanCancel);
        }

        if !listing.active {
            return Err(MarketplaceError::ListingAlreadyInactive);
        }

        listing.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Listing(listing_id), &listing);
        Self::extend_persistent_ttl(&env, &DataKey::Listing(listing_id));

        Ok(())
    }

    pub fn get_listing(env: Env, listing_id: u32) -> Option<Listing> {
        env.storage()
            .persistent()
            .get(&DataKey::Listing(listing_id))
    }

    pub fn get_active_listings(env: Env, start: u32, limit: u32) -> Vec<Listing> {
        let total_listings: u32 = env
            .storage()
            .instance()
            .get::<_, MarketStats>(&DataKey::Stats)
            .map(|s| s.total_listings)
            .unwrap_or(0);
        let mut active_listings = Vec::new(&env);

        let end = (start + limit).min(total_listings);
        for i in start..end {
            if let Some(listing) = env
                .storage()
                .persistent()
                .get::<_, Listing>(&DataKey::Listing(i))
            {
                if listing.active {
                    active_listings.push_back(listing);
                }
            }
        }

        active_listings
    }

    pub fn get_seller_listings(env: Env, seller: Address, active_only: bool) -> Vec<Listing> {
        let total_listings: u32 = env
            .storage()
            .instance()
            .get::<_, MarketStats>(&DataKey::Stats)
            .map(|s| s.total_listings)
            .unwrap_or(0);
        let mut seller_listings = Vec::new(&env);

        for i in 0..total_listings {
            if let Some(listing) = env
                .storage()
                .persistent()
                .get::<_, Listing>(&DataKey::Listing(i))
            {
                if listing.seller == seller && (!active_only || listing.active) {
                    seller_listings.push_back(listing);
                }
            }
        }

        seller_listings
    }

    pub fn get_user_transactions(env: Env, user: Address) -> Vec<Sale> {
        let total_sales: u32 = env
            .storage()
            .instance()
            .get::<_, MarketStats>(&DataKey::Stats)
            .map(|s| s.total_sales)
            .unwrap_or(0);
        let mut user_transactions = Vec::new(&env);

        for i in 0..total_sales {
            if let Some(sale) = env.storage().persistent().get::<_, Sale>(&DataKey::Sale(i)) {
                if sale.buyer == user || sale.seller == user {
                    user_transactions.push_back(sale);
                }
            }
        }

        user_transactions
    }

    pub fn update_price_cap(
        env: Env,
        admin: Address,
        max_multiplier: i128,
        min_multiplier: i128,
        active: bool,
    ) -> Result<(), MarketplaceError> {
        admin.require_auth();

        let stored_admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(addr) => addr,
            None => return Err(MarketplaceError::PaymentTokenNotConfigured),
        };

        if admin != stored_admin {
            return Err(MarketplaceError::Unauthorized);
        }

        let price_cap = PriceCap {
            max_price_multiplier: max_multiplier,
            min_price_multiplier: min_multiplier,
            active,
        };

        // STORAGE: PriceCap moved to `instance` — write rides the contract
        // instance TTL, so no separate persistent extension is needed.
        env.storage().instance().set(&DataKey::PriceCap, &price_cap);
        upg::extend_instance_ttl(&env);

        Ok(())
    }

    // ── Royalty Management ───────────────────────────────────────────────────

    pub fn initialize_royalty_config(
        env: Env,
        admin: Address,
        recipients: Vec<RoyaltyRecipient>,
    ) -> Result<(), MarketplaceError> {
        admin.require_auth();

        let stored_admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(addr) => addr,
            None => return Err(MarketplaceError::PaymentTokenNotConfigured),
        };

        if admin != stored_admin {
            return Err(MarketplaceError::Unauthorized);
        }

        // Validate and calculate total percentage
        let mut total_percentage: u32 = 0;
        for recipient in recipients.iter() {
            total_percentage = total_percentage
                .checked_add(recipient.percentage)
                .ok_or(MarketplaceError::InvalidRoyaltyPercentage)?;
        }

        if total_percentage > 10000 {
            return Err(MarketplaceError::InvalidRoyaltyPercentage);
        }

        let recipients_len = recipients.len();
        let config = RoyaltyConfig {
            recipients,
            total_percentage,
            active: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyConfig, &config);
        Self::extend_persistent_ttl(&env, &DataKey::RoyaltyConfig);

        env.events().publish(
            ("royalty_config_initialized",),
            (total_percentage, recipients_len),
        );

        Ok(())
    }

    pub fn update_royalty_config(
        env: Env,
        admin: Address,
        recipients: Vec<RoyaltyRecipient>,
    ) -> Result<(), MarketplaceError> {
        admin.require_auth();

        let stored_admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(addr) => addr,
            None => return Err(MarketplaceError::PaymentTokenNotConfigured),
        };

        if admin != stored_admin {
            return Err(MarketplaceError::Unauthorized);
        }

        // Check max recipients
        let max_recipients: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::MaxRoyaltyRecipients)
            .unwrap_or(10);

        if recipients.len() > max_recipients {
            return Err(MarketplaceError::RoyaltyRecipientsExceeded);
        }

        // Validate and calculate total percentage
        let mut total_percentage: u32 = 0;
        for recipient in recipients.iter() {
            total_percentage = total_percentage
                .checked_add(recipient.percentage)
                .ok_or(MarketplaceError::InvalidRoyaltyPercentage)?;
        }

        if total_percentage > 10000 {
            return Err(MarketplaceError::InvalidRoyaltyPercentage);
        }

        let recipients_len = recipients.len();
        let config = RoyaltyConfig {
            recipients,
            total_percentage,
            active: true,
        };

        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyConfig, &config);
        Self::extend_persistent_ttl(&env, &DataKey::RoyaltyConfig);

        env.events().publish(
            ("royalty_config_updated",),
            (total_percentage, recipients_len),
        );

        Ok(())
    }

    pub fn update_royalty_recipient(
        env: Env,
        admin: Address,
        index: u32,
        new_recipient: Address,
    ) -> Result<(), MarketplaceError> {
        admin.require_auth();

        let stored_admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(addr) => addr,
            None => return Err(MarketplaceError::PaymentTokenNotConfigured),
        };

        if admin != stored_admin {
            return Err(MarketplaceError::Unauthorized);
        }

        let mut config: RoyaltyConfig = match env
            .storage()
            .persistent()
            .get(&DataKey::RoyaltyConfig)
        {
            Some(c) => c,
            None => return Err(MarketplaceError::RoyaltyConfigNotFound),
        };

        if index >= config.recipients.len() {
            return Err(MarketplaceError::RoyaltyConfigNotFound);
        }

        // Update the recipient at the specified index
        let mut recipient = config
            .recipients
            .get(index)
            .ok_or(MarketplaceError::RoyaltyConfigNotFound)?;
        recipient.recipient = new_recipient.clone();
        config.recipients.set(index, recipient);

        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyConfig, &config);
        Self::extend_persistent_ttl(&env, &DataKey::RoyaltyConfig);

        env.events().publish(
            ("royalty_recipient_updated",),
            (index, new_recipient),
        );

        Ok(())
    }

    pub fn update_royalty_percentage(
        env: Env,
        admin: Address,
        index: u32,
        new_percentage: u32,
    ) -> Result<(), MarketplaceError> {
        admin.require_auth();

        let stored_admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(addr) => addr,
            None => return Err(MarketplaceError::PaymentTokenNotConfigured),
        };

        if admin != stored_admin {
            return Err(MarketplaceError::Unauthorized);
        }

        let mut config: RoyaltyConfig = match env
            .storage()
            .persistent()
            .get(&DataKey::RoyaltyConfig)
        {
            Some(c) => c,
            None => return Err(MarketplaceError::RoyaltyConfigNotFound),
        };

        if index >= config.recipients.len() {
            return Err(MarketplaceError::RoyaltyConfigNotFound);
        }

        // Calculate total without the old percentage at index
        let mut recipient = config
            .recipients
            .get(index)
            .ok_or(MarketplaceError::RoyaltyConfigNotFound)?;
        let old_percentage = recipient.percentage;
        let mut new_total = config
            .total_percentage
            .checked_sub(old_percentage)
            .ok_or(MarketplaceError::InvalidRoyaltyPercentage)?;

        // Add the new percentage
        new_total = new_total
            .checked_add(new_percentage)
            .ok_or(MarketplaceError::InvalidRoyaltyPercentage)?;

        if new_total > 10000 {
            return Err(MarketplaceError::InvalidRoyaltyPercentage);
        }

        // Update the percentage at the specified index
        recipient.percentage = new_percentage;
        config.recipients.set(index, recipient);
        config.total_percentage = new_total;

        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyConfig, &config);
        Self::extend_persistent_ttl(&env, &DataKey::RoyaltyConfig);

        env.events().publish(
            ("royalty_percentage_updated",),
            (index, new_percentage, new_total),
        );

        Ok(())
    }

    pub fn toggle_royalty_config(env: Env, admin: Address, active: bool) -> Result<(), MarketplaceError> {
        admin.require_auth();

        let stored_admin: Address = match env.storage().instance().get(&DataKey::Admin) {
            Some(addr) => addr,
            None => return Err(MarketplaceError::PaymentTokenNotConfigured),
        };

        if admin != stored_admin {
            return Err(MarketplaceError::Unauthorized);
        }

        let mut config: RoyaltyConfig = match env
            .storage()
            .persistent()
            .get(&DataKey::RoyaltyConfig)
        {
            Some(c) => c,
            None => return Err(MarketplaceError::RoyaltyConfigNotFound),
        };

        config.active = active;

        env.storage()
            .persistent()
            .set(&DataKey::RoyaltyConfig, &config);
        Self::extend_persistent_ttl(&env, &DataKey::RoyaltyConfig);

        env.events().publish(("royalty_config_toggled",), (active,));

        Ok(())
    }

    pub fn get_royalty_config(env: Env) -> Option<RoyaltyConfig> {
        env.storage()
            .persistent()
            .get(&DataKey::RoyaltyConfig)
    }

    // ── Upgrade / admin ──────────────────────────────────────────────────────

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

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        upg::extend_persistent_ttl(env, key);
    }
}

#[cfg(test)]
mod test_royalty;
