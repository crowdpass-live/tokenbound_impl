//! Ticket NFT Contract with packed metadata storage.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, String, Symbol,
};

use upgradeable as upg;

/// Token name returned by [`TicketNft::name`]. Static contract-level
/// metadata; per-ticket names live in [`TicketMetadata::name`].
pub const TOKEN_NAME: &str = "CrowdPass Ticket";

/// Token symbol returned by [`TicketNft::symbol`]. Mirrors the ERC-20
/// `symbol()` getter expected by interoperability tooling.
pub const TOKEN_SYMBOL: &str = "TICKET";

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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketMetadata {
    pub name: String,
    pub description: String,
    pub image: String,
    pub event_id: u32,
    pub tier: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OffChainMetadata {
    pub uri: String,
    pub updated_at: u64,
}

/// Packed instance storage: minter + monotonic id (one read/write on mint).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketNftCore {
    pub minter: Address,
    pub next_token_id: u128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventInfo {
    pub event_name: String,
    pub organizer: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TicketMintedEvent {
    pub contract_address: Address,
    pub token_id: u128,
    pub recipient: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MetadataUpdatedEvent {
    pub contract_address: Address,
    pub token_id: u128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OffChainUpdatedEvent {
    pub contract_address: Address,
    pub token_id: u128,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Minting authority + next token id (packed).
    Core,
    Owner(u128),
    Balance(Address),
    Metadata(u128),
    OffChain(u128),
    EventInfo(u32),
}

#[contract]
pub struct TicketNft;

#[contractimpl]
impl TicketNft {
    pub fn __constructor(env: Env, minter: Address) {
        upg::set_admin(&env, &minter);
        upg::init_version(&env);
        let core = TicketNftCore {
            minter: minter.clone(),
            next_token_id: 1,
        };
        env.storage().instance().set(&DataKey::Core, &core);
        upg::extend_instance_ttl(&env);
    }

    pub fn mint_ticket_nft(env: Env, recipient: Address) -> Result<u128, Error> {
        let mut core: TicketNftCore = env
            .storage()
            .instance()
            .get(&DataKey::Core)
            .ok_or(Error::NotInitialized)?;
        core.minter.require_auth();

        let current_balance: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(recipient.clone()))
            .unwrap_or(0);

        if current_balance > 0 {
            return Err(Error::UserAlreadyHasTicket);
        }

        let token_id = core.next_token_id;
        core.next_token_id = token_id.checked_add(1).unwrap();

        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &recipient);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(recipient.clone()), &1u128);

        let metadata = TicketMetadata {
            name: String::from_str(&env, "Ticket"),
            description: String::from_str(&env, "Event admission ticket"),
            image: String::from_str(&env, ""),
            event_id: 0,
            tier: String::from_str(&env, "General"),
        };
        env.storage()
            .persistent()
            .set(&DataKey::Metadata(token_id), &metadata);

        env.storage().instance().set(&DataKey::Core, &core);

        Self::extend_persistent_ttl(&env, &DataKey::Owner(token_id));
        Self::extend_persistent_ttl(&env, &DataKey::Balance(recipient.clone()));
        Self::extend_persistent_ttl(&env, &DataKey::Metadata(token_id));
        upg::extend_instance_ttl(&env);

        let event = TicketMintedEvent {
            contract_address: env.current_contract_address(),
            token_id,
            recipient: recipient.clone(),
        };
        env.events()
            .publish((Symbol::new(&env, "TicketMinted"),), event);

        Ok(token_id)
    }

    pub fn token_uri(env: Env, token_id: u128) -> Result<String, Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        // STORAGE: read-only path. TTL is extended on the write side
        // (`update_off_chain_uri`), so reads do not bump rent.
        if let Some(off_chain) = env
            .storage()
            .persistent()
            .get::<_, OffChainMetadata>(&DataKey::OffChain(token_id))
        {
            return Ok(off_chain.uri);
        }

        Ok(String::from_str(&env, "onchain://ticket"))
    }

    pub fn get_metadata(env: Env, token_id: u128) -> Result<TicketMetadata, Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        // STORAGE: read-only path. TTL extension lives on `mint_ticket_nft` /
        // `update_metadata` so external reads no longer turn into writes.
        env.storage()
            .persistent()
            .get(&DataKey::Metadata(token_id))
            .ok_or(Error::MetadataNotFound)
    }

    pub fn update_metadata(
        env: Env,
        token_id: u128,
        name: Option<String>,
        description: Option<String>,
        image: Option<String>,
        tier: Option<String>,
    ) -> Result<(), Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        let mut metadata: TicketMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::Metadata(token_id))
            .ok_or(Error::MetadataNotFound)?;

        Self::require_metadata_admin(&env, metadata.event_id)?;

        if let Some(n) = name {
            metadata.name = n;
        }
        if let Some(d) = description {
            metadata.description = d;
        }
        if let Some(i) = image {
            metadata.image = i;
        }
        if let Some(t) = tier {
            metadata.tier = t;
        }

        env.storage()
            .persistent()
            .set(&DataKey::Metadata(token_id), &metadata);
        Self::extend_persistent_ttl(&env, &DataKey::Metadata(token_id));

        let event = MetadataUpdatedEvent {
            contract_address: env.current_contract_address(),
            token_id,
        };
        env.events()
            .publish((Symbol::new(&env, "MetadataUpdated"),), event);

        Ok(())
    }

    pub fn update_off_chain_uri(env: Env, token_id: u128, new_uri: String) -> Result<(), Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        let metadata: TicketMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::Metadata(token_id))
            .ok_or(Error::MetadataNotFound)?;

        Self::require_metadata_admin(&env, metadata.event_id)?;

        let off_chain = OffChainMetadata {
            uri: new_uri,
            updated_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::OffChain(token_id), &off_chain);
        Self::extend_persistent_ttl(&env, &DataKey::OffChain(token_id));

        let event = OffChainUpdatedEvent {
            contract_address: env.current_contract_address(),
            token_id,
        };
        env.events()
            .publish((Symbol::new(&env, "OffChainUpdated"),), event);

        Ok(())
    }

    pub fn register_event(env: Env, event_id: u32, event_name: String, organizer: Address) {
        organizer.require_auth();
        let info = EventInfo {
            event_name,
            organizer,
        };
        env.storage()
            .persistent()
            .set(&DataKey::EventInfo(event_id), &info);
        Self::extend_persistent_ttl(&env, &DataKey::EventInfo(event_id));
    }

    pub fn owner_of(env: Env, token_id: u128) -> Result<Address, Error> {
        // STORAGE: read-only path. TTL is extended on writes (mint, transfer,
        // burn) where the entry actually changes, so external `owner_of`
        // queries no longer pay storage rent.
        let owner = env
            .storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .ok_or(Error::InvalidTokenId)?;
        Ok(owner)
    }

    pub fn balance_of(env: Env, owner: Address) -> u128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
    }

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

        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &to);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &0u128);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &1u128);

        Self::extend_persistent_ttl(&env, &DataKey::Owner(token_id));
        Self::extend_persistent_ttl(&env, &DataKey::Balance(from.clone()));
        Self::extend_persistent_ttl(&env, &DataKey::Balance(to.clone()));

        env.events().publish(
            (Symbol::new(&env, "ticket_transferred"),),
            (token_id, from, to),
        );

        Ok(())
    }

    pub fn burn(env: Env, token_id: u128) -> Result<(), Error> {
        let owner = Self::owner_of(env.clone(), token_id)?;
        owner.require_auth();

        env.storage().persistent().remove(&DataKey::Owner(token_id));
        env.storage()
            .persistent()
            .remove(&DataKey::Metadata(token_id));
        env.storage()
            .persistent()
            .remove(&DataKey::OffChain(token_id));
        // STORAGE: remove the now-zero Balance entry rather than writing
        // `0u128`. `balance_of` already returns 0 via `unwrap_or(0)` when
        // the entry is absent, so this saves rent on a no-information slot.
        env.storage()
            .persistent()
            .remove(&DataKey::Balance(owner.clone()));

        env.events().publish(
            (Symbol::new(&env, "ticket_burned"),),
            (token_id, owner),
        );

        Ok(())
    }

    pub fn is_valid(env: Env, token_id: u128) -> bool {
        env.storage().persistent().has(&DataKey::Owner(token_id))
    }

    /// ERC-20 / SEP-41 compatible token name. Returned value is constant
    /// across the contract lifetime — per-ticket names live in
    /// [`TicketMetadata::name`].
    pub fn name(env: Env) -> String {
        String::from_str(&env, TOKEN_NAME)
    }

    /// ERC-20 / SEP-41 compatible token symbol.
    pub fn symbol(env: Env) -> String {
        String::from_str(&env, TOKEN_SYMBOL)
    }

    pub fn get_minter(env: Env) -> Result<Address, Error> {
        let core: TicketNftCore = env
            .storage()
            .instance()
            .get(&DataKey::Core)
            .ok_or(Error::NotInitialized)?;
        Ok(core.minter)
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

    fn require_metadata_admin(env: &Env, event_id: u32) -> Result<(), Error> {
        if event_id != 0 {
            if let Some(info) = env
                .storage()
                .persistent()
                .get::<_, EventInfo>(&DataKey::EventInfo(event_id))
            {
                info.organizer.require_auth();
                return Ok(());
            }
            return Err(Error::OnlyOrganizerCanUpdate);
        }

        let minter: Address = env
            .storage()
            .instance()
            .get::<_, TicketNftCore>(&DataKey::Core)
            .ok_or(Error::NotInitialized)?
            .minter;
        minter.require_auth();
        Ok(())
    }

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        upg::extend_persistent_ttl(env, key);
    }
}

#[cfg(test)]
mod test;

#[cfg(test)]
mod fuzz;
