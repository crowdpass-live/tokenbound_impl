//! POAP (Proof of Attendance) NFT contract
//!
//! Soulbound-style attendance badges minted to arbitrary recipients (typically a
//! ticket's Token Bound Account). One mint per `(event_id, recipient)`.

#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    InvalidTokenId = 2,
    DuplicatePoapForRecipient = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoapTokenMeta {
    pub event_id: u32,
    pub uri: String,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Minter,
    NextTokenId,
    Owner(u128),
    Balance(Address),
    TokenMeta(u128),
    Claimed(u32, Address),
}

#[contract]
pub struct PoapNft;

#[contractimpl]
impl PoapNft {
    pub fn __constructor(env: Env, minter: Address) {
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::NextTokenId, &1u128);
        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);
    }

    /// Mint a single POAP to `recipient` (e.g. a ticket TBA address).
    pub fn mint_poap(
        env: Env,
        recipient: Address,
        event_id: u32,
        metadata_uri: String,
    ) -> Result<u128, Error> {
        let minter: Address = env
            .storage()
            .instance()
            .get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();
        Self::do_mint(&env, recipient, event_id, metadata_uri)
    }

    /// Batch-mint the same badge metadata to many recipients (post-event drop).
    pub fn batch_mint_poap(
        env: Env,
        recipients: Vec<Address>,
        event_id: u32,
        metadata_uri: String,
    ) -> Result<(), Error> {
        let minter: Address = env
            .storage()
            .instance()
            .get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)?;
        minter.require_auth();

        for recipient in recipients.iter() {
            Self::do_mint(&env, recipient.clone(), event_id, metadata_uri.clone())?;
        }
        Ok(())
    }

    fn do_mint(
        env: &Env,
        recipient: Address,
        event_id: u32,
        metadata_uri: String,
    ) -> Result<u128, Error> {
        let claimed_key = DataKey::Claimed(event_id, recipient.clone());
        if env.storage().persistent().has(&claimed_key) {
            return Err(Error::DuplicatePoapForRecipient);
        }

        let token_id: u128 = env
            .storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .unwrap_or(1);

        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &recipient);
        env.storage().persistent().extend_ttl(
            &DataKey::Owner(token_id),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        let bal: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(recipient.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(recipient.clone()), &(bal + 1));
        env.storage().persistent().extend_ttl(
            &DataKey::Balance(recipient.clone()),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        env.storage().persistent().set(
            &DataKey::TokenMeta(token_id),
            &PoapTokenMeta {
                event_id,
                uri: metadata_uri,
            },
        );
        env.storage().persistent().extend_ttl(
            &DataKey::TokenMeta(token_id),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        env.storage().persistent().set(&claimed_key, &true);
        env.storage().persistent().extend_ttl(
            &claimed_key,
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        env.storage()
            .instance()
            .set(&DataKey::NextTokenId, &(token_id + 1));
        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);

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

    pub fn token_metadata(env: Env, token_id: u128) -> Result<PoapTokenMeta, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::TokenMeta(token_id))
            .ok_or(Error::InvalidTokenId)
    }

    pub fn has_claimed(env: Env, event_id: u32, recipient: Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Claimed(event_id, recipient))
    }

    pub fn get_minter(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Minter)
            .ok_or(Error::NotInitialized)
    }
}

#[cfg(test)]
mod test;
