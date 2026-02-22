//! Ticket NFT Contract
//!
//! Minimal NFT implementation for event tickets.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

/// Storage keys for the NFT contract
#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    /// Address with minting privileges
    Minter,
    /// Next token ID to mint
    NextTokenId,
    /// Token ownership: token_id -> owner
    Owner(u128),
    /// Balance: owner -> count
    Balance(Address),
}

/// Ticket NFT Contract
///
/// Minimal NFT implementation for event tickets.
/// Each user can only hold one ticket per event.
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
        env.storage().instance().set(&DataKey::Minter, &minter);
        env.storage().instance().set(&DataKey::NextTokenId, &1u128);

        // Extend instance TTL
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
    /// # Panics
    /// - If caller is not the minter
    /// - If recipient already has a ticket
    pub fn mint_ticket_nft(env: Env, recipient: Address) -> u128 {
        // Authorize: only minter can mint
        let minter: Address = env.storage().instance().get(&DataKey::Minter).unwrap();
        minter.require_auth();

        // Check if user already has a ticket (one per user)
        let current_balance: u128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(recipient.clone()))
            .unwrap_or(0);

        if current_balance > 0 {
            panic!("User already has a ticket");
        }

        // Get next token ID
        let token_id: u128 = env
            .storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .unwrap_or(1);

        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &recipient);

        // Extend persistent TTL for owner
        env.storage().persistent().extend_ttl(
            &DataKey::Owner(token_id),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        env.storage()
            .persistent()
            .set(&DataKey::Balance(recipient.clone()), &1u128);

        // Extend persistent TTL for balance
        env.storage().persistent().extend_ttl(
            &DataKey::Balance(recipient),
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        env.storage()
            .instance()
            .set(&DataKey::NextTokenId, &(token_id + 1));

        // Extend instance TTL on update
        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);

        token_id
    }

    /// Get the owner of a token
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to query
    pub fn owner_of(env: Env, token_id: u128) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .expect("Token ID does not exist")
    }

    /// Get the balance of an owner
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `owner` - The address to query
    pub fn balance_of(env: Env, owner: Address) -> u128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
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
    /// # Panics
    /// - If `from` is not the owner
    /// - If `to` already has a ticket
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

        // Update ownership
        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &to);

        // Update balances
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from), &0u128);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to), &1u128);
    }

    /// Burn a ticket NFT, removing it from existence
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to burn
    ///
    /// # Panics
    /// - If caller is not the token owner
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

    /// Check if a token is valid (exists and not burned)
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to check
    pub fn is_valid(env: Env, token_id: u128) -> bool {
        env.storage().persistent().has(&DataKey::Owner(token_id))
    }

    /// Get the minter address
    ///
    /// # Arguments
    /// * `env` - The contract environment
    pub fn get_minter(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Minter)
            .expect("Not initialized")
    }
}

#[cfg(test)]
mod test;
