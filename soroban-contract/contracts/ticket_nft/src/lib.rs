#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

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
//! Ticket NFT Contract (Stub for Issue #3)
//!
//! Minimal implementation for testing the Ticket Factory.
//! Full implementation to be completed in Issue #3.

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

/// Storage keys for the NFT contract
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
/// A minimal NFT implementation for event tickets.
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
    }

    /// Mint a ticket NFT to the recipient.
    /// Only the minter can call this.
    /// Each recipient can only have one ticket.
    pub fn mint_ticket_nft(env: Env, recipient: Address) -> u128 {
        let minter: Address = env.storage().instance().get(&DataKey::Minter).expect("Not initialized");
        minter.require_auth();

        let balance = Self::balance_of(env.clone(), recipient.clone());
        if balance > 0 {
            panic!("User already has ticket");
        }

        let token_id: u128 = env.storage().instance().get(&DataKey::NextTokenId).unwrap();
        
        // Update ownership
        env.storage().persistent().set(&DataKey::Owner(token_id), &recipient);
        
        // Update balance
        env.storage().persistent().set(&DataKey::Balance(recipient), &1u128);
        
        // Increment token ID
        env.storage().instance().set(&DataKey::NextTokenId, &(token_id + 1));
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

        // Set ownership
        env.storage()
            .persistent()
            .set(&DataKey::Owner(token_id), &recipient);

        // Update balance
        env.storage()
            .persistent()
            .set(&DataKey::Balance(recipient), &1u128);

        // Increment next token ID
        env.storage()
            .instance()
            .set(&DataKey::NextTokenId, &(token_id + 1));

        token_id
    }

    /// Get the owner of a specific token ID.
    /// Get the owner of a token
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_id` - The token ID to query
    ///
    /// # Returns
    /// The owner address
    pub fn owner_of(env: Env, token_id: u128) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .expect("Token ID does not exist")
    }

    /// Get the number of tickets owned by an address.
    /// Since we enforce one ticket per user, this will be 0 or 1.
            .unwrap()
    }

    /// Get the balance of an owner
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `owner` - The address to query
    ///
    /// # Returns
    /// The number of tickets owned
    pub fn balance_of(env: Env, owner: Address) -> u128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
    }

    /// Transfer a ticket NFT from one address to another.
    /// Enforces the one-ticket-per-user rule for the recipient.
    pub fn transfer_from(env: Env, from: Address, to: Address, token_id: u128) {
        from.require_auth();

        let owner = Self::owner_of(env.clone(), token_id);
        if owner != from {
            panic!("Not the owner");
        }

        if Self::balance_of(env.clone(), to.clone()) > 0 {
            panic!("Recipient already has a ticket");
        }

        // Update ownership
        env.storage().persistent().set(&DataKey::Owner(token_id), &to);

        // Update balances
        env.storage().persistent().set(&DataKey::Balance(from), &0u128);
        env.storage().persistent().set(&DataKey::Balance(to), &1u128);
    }
}

mod test;
    /// Get the minter address
    ///
    /// # Arguments
    /// * `env` - The contract environment
    ///
    /// # Returns
    /// The minter address
    pub fn get_minter(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Minter).unwrap()
    }
}
