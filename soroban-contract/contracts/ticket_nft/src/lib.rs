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

        token_id
    }

    /// Get the owner of a specific token ID.
    pub fn owner_of(env: Env, token_id: u128) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::Owner(token_id))
            .expect("Token ID does not exist")
    }

    /// Get the number of tickets owned by an address.
    /// Since we enforce one ticket per user, this will be 0 or 1.
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
