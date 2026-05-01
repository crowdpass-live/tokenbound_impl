//! POAP (Proof of Attendance Protocol) badge NFT contract.
//!
//! - Minted by an authorized minter (typically `event_manager`)
//! - Supports per-event uniqueness: one POAP per (event_id, recipient)
//! - Stores simple on-chain metadata and optional off-chain URI

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, BytesN, Env, String, Symbol,
};

use upgradeable as upg;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    Unauthorized = 2,
    InvalidTokenId = 3,
    AlreadyMintedForEvent = 4,
    MetadataNotFound = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoapMetadata {
    pub event_id: u32,
    pub name: String,
    pub description: String,
    pub image: String,
    pub issued_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OffChainMetadata {
    pub uri: String,
    pub updated_at: u64,
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
    MintedForEvent(u32, Address),
    Approval(u128),
}

#[contract]
pub struct PoapNft;

#[contractimpl]
impl PoapNft {
    pub fn __constructor(env: Env, minter: Address) {
        upg::set_admin(&env, &minter);
        upg::init_version(&env);
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::NextTokenId, &1u128);
        upg::extend_instance_ttl(&env);
    }

    pub fn get_minter(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)
    }

    pub fn mint_poap(env: Env, recipient: Address, metadata: PoapMetadata) -> Result<u128, Error> {
        let minter = Self::get_minter(env.clone())?;
        minter.require_auth();

        let minted_key = DataKey::MintedForEvent(metadata.event_id, recipient.clone());
        if env.storage().persistent().has(&minted_key) {
            return Err(Error::AlreadyMintedForEvent);
        }

        let token_id: u128 = env
            .storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .unwrap_or(1);

        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &recipient);

        let bal_key = DataKey::Balance(recipient.clone());
        let current: u128 = env.storage().persistent().get(&bal_key).unwrap_or(0);
        env.storage()
            .persistent()
            .set(&bal_key, &current.saturating_add(1));

        env.storage()
            .persistent()
            .set(&DataKey::Metadata(token_id), &metadata);
        env.storage().persistent().set(&minted_key, &true);

        env.storage()
            .instance()
            .set(&DataKey::NextTokenId, &(token_id + 1));

        Self::extend_persistent_ttl(&env, &DataKey::Owner(token_id));
        Self::extend_persistent_ttl(&env, &bal_key);
        Self::extend_persistent_ttl(&env, &DataKey::Metadata(token_id));
        Self::extend_persistent_ttl(&env, &minted_key);
        upg::extend_instance_ttl(&env);

        env.events()
            .publish((Symbol::new(&env, "poap_minted"),), (token_id, recipient));

        Ok(token_id)
    }

    pub fn owner_of(env: Env, token_id: u128) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .ok_or(Error::InvalidTokenId)
    }

    pub fn balance_of(env: Env, owner: Address) -> u128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
    }

    pub fn get_metadata(env: Env, token_id: u128) -> Result<PoapMetadata, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Metadata(token_id))
            .ok_or(Error::MetadataNotFound)
    }

    pub fn token_uri(env: Env, token_id: u128) -> Result<String, Error> {
        // STORAGE: pure read path. TTL is extended on the write side
        // (`mint_poap`, `update_off_chain_uri`), so external reads do not
        // bump rent. Earlier revisions called `extend_persistent_ttl` here,
        // turning every `token_uri` query into a storage write.
        if !env.storage().persistent().has(&DataKey::Owner(token_id)) {
            return Err(Error::InvalidTokenId);
        }

        if let Some(off_chain) = env
            .storage()
            .persistent()
            .get::<_, OffChainMetadata>(&DataKey::OffChain(token_id))
        {
            return Ok(off_chain.uri);
        }

        Ok(String::from_str(&env, "onchain://poap"))
    }

    pub fn update_off_chain_uri(env: Env, token_id: u128, new_uri: String) -> Result<(), Error> {
        let minter = Self::get_minter(env.clone())?;
        minter.require_auth();

        if !env.storage().persistent().has(&DataKey::Owner(token_id)) {
            return Err(Error::InvalidTokenId);
        }

        let off_chain = OffChainMetadata {
            uri: new_uri,
            updated_at: env.ledger().timestamp(),
        };
        env.storage()
            .persistent()
            .set(&DataKey::OffChain(token_id), &off_chain);
        Self::extend_persistent_ttl(&env, &DataKey::OffChain(token_id));

        env.events()
            .publish((Symbol::new(&env, "poap_offchain_updated"),), (token_id,));
        Ok(())
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


    /// ERC-20 compatible approve function
    /// Allows `spender` to transfer `token_id` on behalf of the owner
    pub fn approve(env: Env, owner: Address, spender: Address, token_id: u128) -> Result<(), Error> {
        owner.require_auth();
        let current_owner = env.storage().persistent().get::
<DataKey, Address>(&DataKey::Owner(token_id)).ok_or(Error::TokenNotFound)?;
        if current_owner != owner {
            return Err(Error::NotOwner);
        }
        env.storage().persistent().set(&DataKey::Approval(token_id), &spender);
        Ok(())
    }

    /// ERC-20 compatible transfer_from function
    /// Transfers `token_id` from `from` to `to` if caller is approved
    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, token_id: u128) -> Result<(), Error> {
        spender.require_auth();
        let current_owner = env.storage().persistent().get::
<DataKey, Address>(&DataKey::Owner(token_id)).ok_or(Error::TokenNotFound)?;
        if current_owner != from {
            return Err(Error::NotOwner);
        }
        let approved: Address = env.storage().persistent().get(&DataKey::Approval(token_id)).ok_or(Error::NotApproved)?;
        if approved != spender {
            return Err(Error::NotApproved);
        }
        env.storage().persistent().set(&DataKey::Owner(token_id), &to);
        env.storage().persistent().remove(&DataKey::Approval(token_id));
        Ok(())
    }
#[cfg(test)]
mod test;
