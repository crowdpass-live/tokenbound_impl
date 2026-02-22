//! Ticket Factory Contract
//!
//! A factory contract that deploys new Ticket NFT contract instances for each event.
//! Each event gets its own isolated NFT contract for ticket management.
//!
//! # Architecture
//! - Uses Soroban's deployer pattern for deterministic contract deployment
//! - Tracks deployed contracts via event_id -> address mapping
//! - Admin-controlled deployment authorization
//!
//! # Security
//! - Only admin can deploy new ticket contracts
//! - Uses salt for deterministic, unique addresses

#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, Val, Vec};

/// Storage keys for the contract state
#[contracttype]
pub enum DataKey {
    /// Factory administrator address
    Admin,
    /// WASM hash of the Ticket NFT contract to deploy
    TicketWasmHash,
    /// Total number of ticket contracts deployed
    TotalTickets,
    /// Mapping from event_id to deployed ticket contract address
    TicketContract(u32),
}

/// Ticket Factory Contract
///
/// Deploys and tracks Ticket NFT contract instances for events.
#[contract]
pub struct TicketFactory;

#[contractimpl]
impl TicketFactory {
    /// Initialize the factory with an admin and the Ticket NFT WASM hash
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `admin` - Address that can deploy new ticket contracts
    /// * `ticket_wasm_hash` - WASM hash of the Ticket NFT contract
    pub fn __constructor(env: Env, admin: Address, ticket_wasm_hash: BytesN<32>) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::TicketWasmHash, &ticket_wasm_hash);
        env.storage().instance().set(&DataKey::TotalTickets, &0u32);

        // Extend instance TTL
        env.storage().instance().extend_ttl(
            30 * 24 * 60 * 60 / 5,  // ~30 days
            100 * 24 * 60 * 60 / 5, // ~100 days
        );
    }

    /// Deploy a new Ticket NFT contract for an event
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `minter` - Address that will have minting rights on the new contract
    /// * `salt` - Unique salt for deterministic address generation
    ///
    /// # Returns
    /// The address of the newly deployed Ticket NFT contract
    ///
    /// # Authorization
    /// Requires admin authorization
    pub fn deploy_ticket(env: Env, minter: Address, salt: BytesN<32>) -> Address {
        // Authorize: only admin can deploy
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        // Get the WASM hash for deployment
        let wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::TicketWasmHash)
            .unwrap();

        // Prepare constructor arguments for the Ticket NFT contract
        // The minter address is passed to initialize the NFT contract
        let constructor_args: Vec<Val> = (minter.clone(),).into_val(&env);

        // Deploy using Soroban's deployer pattern
        // This creates a new contract instance with a deterministic address
        let deployed_address = env
            .deployer()
            .with_address(env.current_contract_address(), salt)
            .deploy_v2(wasm_hash, constructor_args);

        // Increment ticket count and store the mapping
        let ticket_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalTickets)
            .unwrap_or(0)
            + 1;

        // Store event_id -> contract address mapping in persistent storage
        env.storage()
            .persistent()
            .set(&DataKey::TicketContract(ticket_id), &deployed_address);

        // Extend persistent TTL
        env.storage().persistent().extend_ttl(
            &DataKey::TicketContract(ticket_id),
            30 * 24 * 60 * 60 / 5,  // threshold
            100 * 24 * 60 * 60 / 5, // extend_to
        );

        // Update total count in instance storage
        env.storage()
            .instance()
            .set(&DataKey::TotalTickets, &ticket_id);

        // Extend instance TTL on update
        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);

        deployed_address
    }

    /// Get the ticket contract address for a specific event
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `event_id` - The event identifier (1-indexed)
    ///
    /// # Returns
    /// The address of the ticket contract, or None if not found
    pub fn get_ticket_contract(env: Env, event_id: u32) -> Option<Address> {
        env.storage()
            .persistent()
            .get(&DataKey::TicketContract(event_id))
    }

    /// Get the total number of ticket contracts deployed
    ///
    /// # Arguments
    /// * `env` - The contract environment
    ///
    /// # Returns
    /// The total count of deployed ticket contracts
    pub fn get_total_tickets(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TotalTickets)
            .unwrap_or(0)
    }

    /// Get the factory admin address
    ///
    /// # Arguments
    /// * `env` - The contract environment
    ///
    /// # Returns
    /// The admin address
    pub fn get_admin(env: Env) -> Address {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();

        // Extend instance TTL on read
        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);

        admin
    }
}

mod test;
