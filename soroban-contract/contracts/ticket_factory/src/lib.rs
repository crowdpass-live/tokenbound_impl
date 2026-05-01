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

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN,
    Env, IntoVal, Symbol, Val, Vec,
};

use upgradeable as upg;

/// Error codes for the Ticket Factory contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    Unauthorized = 2,
    /// `deploy_ticket` was called by an address that is not on the
    /// configured deployer registry's allowlist.
    DeployerNotAuthorized = 3,
}

/// Storage keys for the contract state.
///
/// Admin lives only in [`upgradeable::UpgradeKey::Admin`] (see `upg::set_admin`);
/// duplicating it here wasted an instance slot and an extra write on init.
#[contracttype]
pub enum DataKey {
    /// WASM hash of the Ticket NFT contract to deploy
    TicketWasmHash,
    /// Total number of ticket contracts deployed
    TotalTickets,
    /// Mapping from event_id to deployed ticket contract address
    TicketContract(u32),
    /// Optional `DeployerRegistry` contract address. When set, the factory
    /// gates `deploy_ticket` on `registry.is_authorized(caller)` in
    /// addition to the existing admin auth check. When unset, the factory
    /// behaves identically to before (admin-only, no allowlist gate).
    DeployerRegistry,
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
        upg::set_admin(&env, &admin);
        upg::init_version(&env);
        env.storage()
            .instance()
            .set(&DataKey::TicketWasmHash, &ticket_wasm_hash);
        env.storage().instance().set(&DataKey::TotalTickets, &0u32);

        // Extend instance TTL
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "factory_init"),),
            admin,
        );
    }

    /// Deploy a new Ticket NFT contract for an event.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `minter` - Address that will have minting rights on the new contract
    /// * `salt` - Unique salt for deterministic address generation
    ///
    /// # Returns
    /// The address of the newly deployed Ticket NFT contract.
    ///
    /// # Authorization
    /// 1. Requires admin authorization (`admin.require_auth()`).
    /// 2. **If a `DeployerRegistry` is configured** via [`Self::set_deployer_registry`],
    ///    the factory additionally invokes
    ///    `registry.is_authorized(minter)` and rejects the call with
    ///    [`Error::DeployerNotAuthorized`] if the minter is not on the
    ///    allowlist (the factory admin is implicitly authorized inside the
    ///    registry's `is_authorized` check). When no registry is configured
    ///    the factory falls back to the historical admin-only model.
    pub fn deploy_ticket(env: Env, minter: Address, salt: BytesN<32>) -> Result<Address, Error> {
        // Authorize: only admin can deploy
        let admin: Address = upg::try_get_admin(&env).ok_or(Error::NotInitialized)?;
        admin.require_auth();

        // Optional RBAC gate: if a DeployerRegistry is configured, ensure
        // the minter is on its allowlist before invoking the deployer.
        if let Some(registry) = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::DeployerRegistry)
        {
            let authorized: bool = env.invoke_contract(
                &registry,
                &Symbol::new(&env, "is_authorized"),
                soroban_sdk::vec![&env, minter.clone().into_val(&env)],
            );
            if !authorized {
                return Err(Error::DeployerNotAuthorized);
            }
        }

        // Get the WASM hash for deployment
        let wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::TicketWasmHash)
            .ok_or(Error::NotInitialized)?;

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
            .unwrap_or(0u32)
            .checked_add(1)
            .unwrap();

        // Store event_id -> contract address mapping in persistent storage
        env.storage()
            .persistent()
            .set(&DataKey::TicketContract(ticket_id), &deployed_address);

        // Extend persistent TTL
        upg::extend_persistent_ttl(&env, &DataKey::TicketContract(ticket_id));

        // Update total count in instance storage
        env.storage()
            .instance()
            .set(&DataKey::TotalTickets, &ticket_id);

        // Extend instance TTL on update
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "ticket_deployed"), ticket_id),
            deployed_address.clone(),
        );

        Ok(deployed_address)
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

    /// Verify an Ed25519 signature for off-chain authorization
    ///
    /// Facilitates the verification of off-chain signed data, such as
    /// oracle price feeds or organizer-signed ticket vouchers.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `public_key` - The Ed25519 public key of the signer
    /// * `payload` - The arbitrary message payload that was signed
    /// * `signature` - The 64-byte Ed25519 signature
    ///
    /// Panics if the signature is invalid.
    pub fn verify_offchain_signature(env: Env, public_key: BytesN<32>, payload: Bytes, signature: BytesN<64>) {
        env.crypto().ed25519_verify(&public_key, &payload, &signature);
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

    /// Configure (or replace) the `DeployerRegistry` contract that gates
    /// `deploy_ticket`. Pass `None` to detach the current registry and
    /// revert to the historical admin-only deployment model.
    ///
    /// # Authorization
    /// Admin-only — `admin.require_auth()` plus an explicit equality
    /// check against the stored admin.
    pub fn set_deployer_registry(
        env: Env,
        admin: Address,
        registry: Option<Address>,
    ) -> Result<(), Error> {
        admin.require_auth();
        let stored: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored != admin {
            return Err(Error::Unauthorized);
        }

        match registry {
            Some(addr) => {
                env.storage()
                    .instance()
                    .set(&DataKey::DeployerRegistry, &addr);
                env.events().publish(
                    (symbol_short!("registry"), symbol_short!("set")),
                    addr,
                );
            }
            None => {
                env.storage().instance().remove(&DataKey::DeployerRegistry);
                env.events().publish(
                    (symbol_short!("registry"), symbol_short!("cleared")),
                    (),
                );
            }
        }
        upg::extend_instance_ttl(&env);
        Ok(())
    }

    /// Read the configured `DeployerRegistry` address, if any.
    pub fn get_deployer_registry(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::DeployerRegistry)
    }

    /// Get the factory admin address
    ///
    /// # Arguments
    /// * `env` - The contract environment
    ///
    /// # Returns
    /// The admin address
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        let admin: Address = upg::try_get_admin(&env).ok_or(Error::NotInitialized)?;

        // Extend instance TTL on read
        upg::extend_instance_ttl(&env);

        Ok(admin)
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
}

mod test;
