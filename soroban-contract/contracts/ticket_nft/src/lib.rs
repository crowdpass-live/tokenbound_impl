#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Val, Vec};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Minter,
    NextTokenId,
    Owner(u128),
    Balance(Address),
}

#[contract]
pub struct TicketNFT;

#[contractimpl]
impl TicketNFT {
    /// Initialize the contract with a minter address.
    pub fn initialize(env: Env, minter: Address) {
        if env.storage().instance().has(&DataKey::Minter) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::NextTokenId, &1u128);
    }

    /// Mint a new ticket NFT to the recipient.
    /// Only the minter can call this.
    pub fn mint_ticket_nft(env: Env, recipient: Address) -> u128 {
        let minter: Address = env
            .storage()
            .instance()
            .get(&DataKey::Minter)
            .expect("Not initialized");
        minter.require_auth();

        if Self::balance_of(env.clone(), recipient.clone()) > 0 {
            panic!("User already has ticket");
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
            .set(&DataKey::Balance(recipient), &1u128);
        env.storage()
            .instance()
            .set(&DataKey::NextTokenId, &(token_id + 1));

        token_id
    }

    /// Get the owner of a specific token ID.
    pub fn owner_of(env: Env, token_id: u128) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .expect("Token ID does not exist")
    }

    /// Get the balance of an owner.
    pub fn balance_of(env: Env, owner: Address) -> u128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
    }

    /// Transfer a ticket NFT from one address to another.
    pub fn transfer_from(env: Env, from: Address, to: Address, token_id: u128) {
        from.require_auth();

        if !Self::is_valid(env.clone(), token_id) {
            panic!("Token is not valid");
        }

        let owner = Self::owner_of(env.clone(), token_id);
        if owner != from {
            panic!("Not the owner");
        }

        if Self::balance_of(env.clone(), to.clone()) > 0 {
            panic!("Recipient already has a ticket");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &to);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from), &0u128);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to), &1u128);
    }

    pub fn burn(env: Env, token_id: u128) {
        let owner = Self::owner_of(env.clone(), token_id);

        // Authorize: only owner can burn
        // In a real implementation, we might want to allow minter too,
        // but require_auth() is the most reliable way to handle this in Soroban.
        owner.require_auth();

        env.storage().persistent().remove(&DataKey::Owner(token_id));
        env.storage()
            .persistent()
            .set(&DataKey::Balance(owner), &0u128);
    }

    /// Check if a token is valid (exists and not burned).
    pub fn is_valid(env: Env, token_id: u128) -> bool {
        env.storage().persistent().has(&DataKey::Owner(token_id))
    }

    /// Get the minter address.
    pub fn get_minter(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Minter)
            .expect("Not initialized")
    }
}

#[cfg(test)]
mod test;
