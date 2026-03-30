//! Ticket NFT Contract with Metadata Support
//!
//! NFT implementation for event tickets with on-chain metadata.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, BytesN, Env};

use upgradeable as upg;

// Error handling
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    UserAlreadyHasTicket = 1,
    InvalidTokenId = 2,
    Unauthorized = 3,
    RecipientAlreadyHasTicket = 4,
    NotInitialized = 5,
    MetadataNotFound = 6,
    OnlyOrganizerCanUpdate = 7,
}

/// Simple metadata fields stored separately
#[contracttype]
#[derive(Clone)]
pub struct TicketMetadata {
    pub name: String,
    pub description: String,
    pub image: String,
    pub event_id: u32,
    pub tier: String,
}

/// Storage keys for the NFT contract
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Minter,
    NextTokenId,
    Owner(u128),
    Balance(Address),
    MetadataName(u128),
    MetadataDesc(u128),
    MetadataImage(u128),
    MetadataEventId(u128),
    MetadataTier(u128),
    OffChainUri(u128),
    OffChainUpdated(u128),
    EventName(u32),
    EventOrganizer(u32),
    TokenEvent(u128),
    Admin,
}

#[contract]
pub struct TicketNft;

#[contractimpl]
impl TicketNft {
    /// Initialize the NFT contract with a minter address
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `minter` - Address that can mint new tickets
    pub fn __constructor(env: Env, minter: Address) {
        upg::set_admin(&env, &minter);
        upg::init_version(&env);
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextTokenId, &1u128);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::BaseUri, &base_uri);
        
        // Default restrictions
        env.storage().instance().set(&DataKey::TransfersEnabled, &true);
        env.storage().instance().set(&DataKey::TransferCooldown, &0u64);
        env.storage().instance().set(&DataKey::TransferFeeBps, &0u32);
        env.storage().instance().set(&DataKey::Organizer, &minter);

        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);
    }

    /// Mint a new ticket NFT to the recipient
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `recipient` - Address to receive the ticket
    ///
    /// # Returns
    /// The token ID of the minted ticket
    ///
    /// # Errors
    /// - If caller is not the minter
    /// - If recipient already has a ticket
    pub fn mint_ticket_nft(env: Env, recipient: Address) -> Result<u128, Error> {
        // Authorize: only minter can mint
        let minter: Address = env
            .storage()
            .instance()
            .get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();

        let current_balance: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(recipient.clone()))
            .unwrap_or(0);

        if current_balance > 0 {
            return Err(Error::UserAlreadyHasTicket);
        }

        let token_id: u128 = env
            .storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .unwrap_or(1);

        // Store ownership
        env.storage().persistent().set(&DataKey::Owner(token_id), &recipient);
        
        // Store metadata fields separately
        env.storage().persistent().set(&DataKey::MetadataName(token_id), &name);
        env.storage().persistent().set(&DataKey::MetadataDesc(token_id), &description);
        env.storage().persistent().set(&DataKey::MetadataImage(token_id), &image);
        env.storage().persistent().set(&DataKey::MetadataEventId(token_id), &event_id);
        env.storage().persistent().set(&DataKey::MetadataTier(token_id), &tier);
        env.storage().persistent().set(&DataKey::TokenEvent(token_id), &event_id);
        
        // Store off-chain metadata if provided
        if let Some(uri) = off_chain_uri {
            env.storage().persistent().set(&DataKey::OffChainUri(token_id), &uri);
            env.storage().persistent().set(&DataKey::OffChainUpdated(token_id), &env.ledger().timestamp());
        }

        // Update balance
        env.storage().persistent().set(&DataKey::Balance(recipient.clone()), &1u128);

        // Increment token counter
        env.storage().instance().set(&DataKey::NextTokenId, &(token_id + 1));

        Self::extend_ttl(&env, token_id);
        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);

        env.events().publish(
            (Symbol::new(&env, "ticket_minted"),),
            (token_id, recipient, event_id, tier),
        );

        Ok(token_id)
    }

    /// Get token URI - returns off-chain URI if available, otherwise returns a simple string
    pub fn token_uri(env: Env, token_id: u128) -> Result<String, Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        // Check for off-chain URI first
        if let Some(uri) = env.storage().persistent().get::<_, String>(&DataKey::OffChainUri(token_id)) {
            return Ok(uri);
        }

        // Return a simple static string indicating on-chain metadata
        // Frontend should call get_metadata() to fetch the actual data
        let uri = String::from_str(&env, "onchain://ticket");
        Ok(uri)
    }

    pub fn get_metadata(env: Env, token_id: u128) -> Result<TicketMetadata, Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }
        
        Ok(TicketMetadata {
            name: env.storage().persistent().get(&DataKey::MetadataName(token_id)).ok_or(Error::MetadataNotFound)?,
            description: env.storage().persistent().get(&DataKey::MetadataDesc(token_id)).ok_or(Error::MetadataNotFound)?,
            image: env.storage().persistent().get(&DataKey::MetadataImage(token_id)).ok_or(Error::MetadataNotFound)?,
            event_id: env.storage().persistent().get(&DataKey::MetadataEventId(token_id)).ok_or(Error::MetadataNotFound)?,
            tier: env.storage().persistent().get(&DataKey::MetadataTier(token_id)).ok_or(Error::MetadataNotFound)?,
        })
    }

    pub fn update_metadata(
        env: Env,
        token_id: u128,
        name: Option<String>,
        description: Option<String>,
        image: Option<String>,
        tier: Option<String>,
    ) -> Result<(), Error> {
        let event_id: u32 = env.storage().persistent().get(&DataKey::TokenEvent(token_id))
            .ok_or(Error::InvalidTokenId)?;
        
        let organizer: Address = env.storage().persistent().get(&DataKey::EventOrganizer(event_id))
            .ok_or(Error::OnlyOrganizerCanUpdate)?;
        organizer.require_auth();

        if let Some(n) = name {
            env.storage().persistent().set(&DataKey::MetadataName(token_id), &n);
        }
        if let Some(d) = description {
            env.storage().persistent().set(&DataKey::MetadataDesc(token_id), &d);
        }
        if let Some(i) = image {
            env.storage().persistent().set(&DataKey::MetadataImage(token_id), &i);
        }
        if let Some(t) = tier {
            env.storage().persistent().set(&DataKey::MetadataTier(token_id), &t);
        }

        Self::extend_ttl(&env, token_id);

        env.events().publish(
            (Symbol::new(&env, "metadata_updated"),),
            (token_id,),
        );

        Ok(())
    }

    pub fn update_off_chain_uri(
        env: Env,
        token_id: u128,
        new_uri: String,
    ) -> Result<(), Error> {
        let event_id: u32 = env.storage().persistent().get(&DataKey::TokenEvent(token_id))
            .ok_or(Error::InvalidTokenId)?;
        
        let organizer: Address = env.storage().persistent().get(&DataKey::EventOrganizer(event_id))
            .ok_or(Error::OnlyOrganizerCanUpdate)?;
        organizer.require_auth();

        env.storage().persistent().set(&DataKey::OffChainUri(token_id), &new_uri);
        env.storage().persistent().set(&DataKey::OffChainUpdated(token_id), &env.ledger().timestamp());

        Self::extend_ttl(&env, token_id);

        env.events().publish(
            (Symbol::new(&env, "offchain_updated"),),
            (token_id,),
        );

        Ok(())
    }

    pub fn register_event(env: Env, event_id: u32, event_name: String, organizer: Address) {
        organizer.require_auth();
        
        env.storage().persistent().set(&DataKey::EventName(event_id), &event_name);
        env.storage().persistent().set(&DataKey::EventOrganizer(event_id), &organizer);
        
        Self::extend_persistent_ttl(&env, &DataKey::EventName(event_id));
        Self::extend_persistent_ttl(&env, &DataKey::EventOrganizer(event_id));
    }

    pub fn owner_of(env: Env, token_id: u128) -> Result<Address, Error> {
        env.storage().persistent().get(&DataKey::Owner(token_id))
            .ok_or(Error::InvalidTokenId)
    }

    pub fn balance_of(env: Env, owner: Address) -> u128 {
        env.storage().persistent().get(&DataKey::Balance(owner)).unwrap_or(0)
    }

    /// Transfer a ticket NFT from one address to another
    ///
    /// Enforces the one-ticket-per-user rule for the recipient.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `from` - Current owner of the ticket
    /// * `to` - Recipient address
    /// * `token_id` - The token ID to transfer
    ///
    /// # Errors
    /// - If `from` is not the owner
    /// - If `to` already has a ticket
    pub fn transfer_from(
        env: Env,
        from: Address,
        to: Address,
        token_id: u128,
    ) -> Result<(), Error> {
        from.require_auth();

        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        let owner = Self::owner_of(env.clone(), token_id)?;
        if owner != from {
            return Err(Error::Unauthorized);
        }

        if Self::balance_of(env.clone(), to.clone()) > 0 {
            return Err(Error::RecipientAlreadyHasTicket);
        }

        // Check global transfer toggle
        let enabled: bool = env.storage().instance().get(&DataKey::TransfersEnabled).unwrap_or(true);
        if !enabled {
            return Err(Error::TransferDisabled);
        }

        // Check blocklist
        if env.storage().persistent().has(&DataKey::Blocklist(from.clone())) || 
           env.storage().persistent().has(&DataKey::Blocklist(to.clone())) {
            return Err(Error::AddressBlocked);
        }

        // Check cooldown
        let cooldown: u64 = env.storage().instance().get(&DataKey::TransferCooldown).unwrap_or(0);
        if cooldown > 0 {
            let last_transfer: u64 = env.storage().persistent().get(&DataKey::LastTransfer(token_id)).unwrap_or(0);
            if env.ledger().timestamp() < last_transfer + cooldown {
                return Err(Error::TransferCooldownActive);
            }
        }

        // Update ownership
        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &to);

        // Update last transfer time
        env.storage()
            .persistent()
            .set(&DataKey::LastTransfer(token_id), &env.ledger().timestamp());

        // Update balances
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from), &0u128);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to), &1u128);

        Ok(())
    }

    pub fn burn(env: Env, token_id: u128) -> Result<(), Error> {
        let owner = Self::owner_of(env.clone(), token_id)?;
        owner.require_auth();

        env.storage().persistent().remove(&DataKey::Owner(token_id));
        env.storage().persistent().remove(&DataKey::MetadataName(token_id));
        env.storage().persistent().remove(&DataKey::MetadataDesc(token_id));
        env.storage().persistent().remove(&DataKey::MetadataImage(token_id));
        env.storage().persistent().remove(&DataKey::MetadataEventId(token_id));
        env.storage().persistent().remove(&DataKey::MetadataTier(token_id));
        env.storage().persistent().remove(&DataKey::OffChainUri(token_id));
        env.storage().persistent().remove(&DataKey::OffChainUpdated(token_id));
        env.storage().persistent().remove(&DataKey::TokenEvent(token_id));
        env.storage().persistent().set(&DataKey::Balance(owner), &0u128);

        Ok(())
    }

    pub fn is_valid(env: Env, token_id: u128) -> bool {
        env.storage().persistent().has(&DataKey::Owner(token_id))
    }

    pub fn get_minter(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Minter).ok_or(Error::NotInitialized)
    }

    fn extend_ttl(env: &Env, token_id: u128) {
        Self::extend_persistent_ttl(env, &DataKey::Owner(token_id));
        Self::extend_persistent_ttl(env, &DataKey::MetadataName(token_id));
        Self::extend_persistent_ttl(env, &DataKey::MetadataDesc(token_id));
        Self::extend_persistent_ttl(env, &DataKey::MetadataImage(token_id));
        Self::extend_persistent_ttl(env, &DataKey::MetadataEventId(token_id));
        Self::extend_persistent_ttl(env, &DataKey::MetadataTier(token_id));
        Self::extend_persistent_ttl(env, &DataKey::TokenEvent(token_id));
    }

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        env.storage()
            .persistent()
            .extend_ttl(key, 30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);
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

    /// Get the contract name
    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    /// Get the contract symbol
    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    /// Get the token URI for a specific token
    pub fn token_uri(env: Env, token_id: u128) -> String {
        if !Self::is_valid(env.clone(), token_id) {
            panic!("Invalid token ID");
        }

        if let Some(uri) = env.storage().persistent().get(&DataKey::TokenUri(token_id)) {
            uri
        } else {
            env.storage().instance().get(&DataKey::BaseUri).unwrap()
        }
    }

    /// Set the token URI for a specific token (minter-only)
    pub fn set_token_uri(env: Env, token_id: u128, uri: String) -> Result<(), Error> {
        let minter: Address = env.storage().instance().get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();

        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        env.storage().persistent().set(&DataKey::TokenUri(token_id), &uri);
        
        // Extend persistent TTL for URI
        env.storage().persistent().extend_ttl(
            &DataKey::TokenUri(token_id),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        Ok(())
    }

    /// Update transfer restrictions (minter-only)
    pub fn set_transfer_restrictions(env: Env, enabled: bool, cooldown: u64, fee_bps: u32) -> Result<(), Error> {
        let minter: Address = env.storage().instance().get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();

        env.storage().instance().set(&DataKey::TransfersEnabled, &enabled);
        env.storage().instance().set(&DataKey::TransferCooldown, &cooldown);
        env.storage().instance().set(&DataKey::TransferFeeBps, &fee_bps);

        Ok(())
    }

    /// Set organizer address (minter-only)
    pub fn set_organizer(env: Env, organizer: Address) -> Result<(), Error> {
        let minter: Address = env.storage().instance().get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();

        env.storage().instance().set(&DataKey::Organizer, &organizer);

        Ok(())
    }

    /// Get transfer fee bps
    pub fn get_transfer_fee_bps(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::TransferFeeBps).unwrap_or(0)
    }

    /// Get organizer address
    pub fn get_organizer(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Organizer).unwrap()
    }

    /// Add or remove from blocklist (minter-only)
    pub fn set_blocklist(env: Env, address: Address, blocked: bool) -> Result<(), Error> {
        let minter: Address = env.storage().instance().get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();

        if blocked {
            env.storage().persistent().set(&DataKey::Blocklist(address.clone()), &true);
            env.storage().persistent().extend_ttl(
                &DataKey::Blocklist(address),
                30 * 24 * 60 * 60 / 5,
                100 * 24 * 60 * 60 / 5,
            );
        } else {
            env.storage().persistent().remove(&DataKey::Blocklist(address));
        }

        Ok(())
    }

    /// Set original price for per-token resale cap (minter-only)
    pub fn set_original_price(env: Env, token_id: u128, price: i128) -> Result<(), Error> {
        let minter: Address = env.storage().instance().get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();

        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        env.storage().persistent().set(&DataKey::OriginalPrice(token_id), &price);
        env.storage().persistent().extend_ttl(
            &DataKey::OriginalPrice(token_id),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        Ok(())
    }

    /// Get original price of a token
    pub fn get_original_price(env: Env, token_id: u128) -> i128 {
        env.storage().persistent().get(&DataKey::OriginalPrice(token_id)).unwrap_or(0)
    }

    /// Check if an address is blocked
    pub fn is_blocked(env: Env, address: Address) -> bool {
        env.storage().persistent().has(&DataKey::Blocklist(address))
    }
}

#[cfg(test)]
mod test;

