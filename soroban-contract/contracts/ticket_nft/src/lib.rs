//! Ticket NFT Contract with packed metadata storage.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, String, Symbol,
};

use upgradeable as upg;

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
    InvalidStringInput = 8,
}

const MAX_METADATA_FIELD_BYTES: u32 = 200;
const MAX_URI_BYTES: u32 = 1024;

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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct EventInfo {
    pub event_name: String,
    pub organizer: Address,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Minter,
    NextTokenId,
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
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::NextTokenId, &1u128);
        upg::extend_instance_ttl(&env);
    }

    pub fn mint_ticket_nft(env: Env, recipient: Address) -> Result<u128, Error> {
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

        env.storage()
            .instance()
            .set(&DataKey::NextTokenId, &(token_id + 1));

        Self::extend_persistent_ttl(&env, &DataKey::Owner(token_id));
        Self::extend_persistent_ttl(&env, &DataKey::Balance(recipient.clone()));
        Self::extend_persistent_ttl(&env, &DataKey::Metadata(token_id));
        upg::extend_instance_ttl(&env);

        env.events()
            .publish((Symbol::new(&env, "ticket_minted"),), (token_id, recipient));

        Ok(token_id)
    }

    pub fn token_uri(env: Env, token_id: u128) -> Result<String, Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        if let Some(off_chain) = env
            .storage()
            .persistent()
            .get::<_, OffChainMetadata>(&DataKey::OffChain(token_id))
        {
            Self::extend_persistent_ttl(&env, &DataKey::OffChain(token_id));
            return Ok(off_chain.uri);
        }

        Ok(String::from_str(&env, "onchain://ticket"))
    }

    pub fn get_metadata(env: Env, token_id: u128) -> Result<TicketMetadata, Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        let metadata: TicketMetadata = env
            .storage()
            .persistent()
            .get(&DataKey::Metadata(token_id))
            .ok_or(Error::MetadataNotFound)?;
        Self::extend_persistent_ttl(&env, &DataKey::Metadata(token_id));
        Ok(metadata)
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

        // Bound every supplied field before doing any work so a malformed call
        // cannot consume storage/CPU writing oversized strings.
        if let Some(ref n) = name {
            Self::validate_bounded_string(n, MAX_METADATA_FIELD_BYTES)?;
        }
        if let Some(ref d) = description {
            Self::validate_bounded_string(d, MAX_METADATA_FIELD_BYTES)?;
        }
        if let Some(ref i) = image {
            Self::validate_bounded_string(i, MAX_URI_BYTES)?;
        }
        if let Some(ref t) = tier {
            Self::validate_bounded_string(t, MAX_METADATA_FIELD_BYTES)?;
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

        env.events()
            .publish((Symbol::new(&env, "metadata_updated"),), (token_id,));

        Ok(())
    }

    pub fn update_off_chain_uri(env: Env, token_id: u128, new_uri: String) -> Result<(), Error> {
        if !Self::is_valid(env.clone(), token_id) {
            return Err(Error::InvalidTokenId);
        }

        Self::validate_bounded_string(&new_uri, MAX_URI_BYTES)?;

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

        env.events()
            .publish((Symbol::new(&env, "offchain_updated"),), (token_id,));

        Ok(())
    }

    pub fn register_event(
        env: Env,
        event_id: u32,
        event_name: String,
        organizer: Address,
    ) -> Result<(), Error> {
        organizer.require_auth();
        Self::validate_bounded_string(&event_name, MAX_METADATA_FIELD_BYTES)?;
        let info = EventInfo {
            event_name,
            organizer,
        };
        env.storage()
            .persistent()
            .set(&DataKey::EventInfo(event_id), &info);
        Self::extend_persistent_ttl(&env, &DataKey::EventInfo(event_id));
        Ok(())
    }

    pub fn owner_of(env: Env, token_id: u128) -> Result<Address, Error> {
        let owner = env
            .storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .ok_or(Error::InvalidTokenId)?;
        Self::extend_persistent_ttl(&env, &DataKey::Owner(token_id));
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
        Self::extend_persistent_ttl(&env, &DataKey::Balance(from));
        Self::extend_persistent_ttl(&env, &DataKey::Balance(to));

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
        env.storage()
            .persistent()
            .set(&DataKey::Balance(owner.clone()), &0u128);
        Self::extend_persistent_ttl(&env, &DataKey::Balance(owner));

        Ok(())
    }

    pub fn is_valid(env: Env, token_id: u128) -> bool {
        env.storage().persistent().has(&DataKey::Owner(token_id))
    }

    pub fn get_minter(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)
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
            .get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();
        Ok(())
    }

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        upg::extend_persistent_ttl(env, key);
    }
}

#[cfg(test)]
mod test;
