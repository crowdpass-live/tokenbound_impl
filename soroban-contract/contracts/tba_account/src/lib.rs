#![no_std]
use soroban_sdk::{
    auth::Context, contract, contracterror, contractimpl, contracttype, Address, BytesN, Env,
    IntoVal, Symbol, Val, Vec,
};

use nonce_manager::{get_nonce, increment_nonce};
use upgradeable as upg;

mod asset_transfer;

#[cfg(test)]
mod asset_transfer_test;

// Error handling
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
}

#[contract]
pub struct TbaAccount;

// STORAGE: TBA token binding (token_contract / token_id / implementation_hash
// / salt) is written exactly once in `initialize` and never mutates after.
// Pack the four immutable fields into a single `Config` instance entry — this
// drops `initialize` from 5 instance writes (TokenContract, TokenId,
// ImplementationHash, Salt, Initialized) to 1, and the entry's existence
// itself replaces the explicit `Initialized` flag (`is_initialized` becomes
// `has(&Config)`).
//
// Nonce state is owned by the external `nonce_manager` crate and is therefore
// not represented in this enum.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TbaConfig {
    pub token_contract: Address,
    pub token_id: u128,
    pub implementation_hash: BytesN<32>,
    pub salt: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Packed token binding (set once in `initialize`).
    Config,
}

// Helper functions for storage
fn get_config(env: &Env) -> Result<TbaConfig, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .ok_or(Error::NotInitialized)
}

fn set_config(env: &Env, config: &TbaConfig) {
    env.storage().instance().set(&DataKey::Config, config);
}

fn get_token_contract(env: &Env) -> Result<Address, Error> {
    Ok(get_config(env)?.token_contract)
}

fn get_token_id(env: &Env) -> Result<u128, Error> {
    Ok(get_config(env)?.token_id)
}

fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Config)
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransactionExecutedEvent {
    pub contract_address: Address,
    pub to: Address,
    pub func: Symbol,
    pub nonce: u64,
}

// Helper function to get NFT owner by calling the NFT contract
fn get_nft_owner(env: &Env, nft_contract: &Address, token_id: u128) -> Address {
    // Call the NFT contract's owner_of function
    // The NFT owner_of expects (token_id: u128)
    env.invoke_contract::<Address>(
        nft_contract,
        &soroban_sdk::symbol_short!("owner_of"),
        soroban_sdk::vec![&env, token_id.into_val(env)],
    )
}

#[contractimpl]
impl TbaAccount {
    /// Initialize the TBA account with NFT ownership details
    /// This should be called once after deployment by the Registry
    pub fn initialize(
        env: Env,
        token_contract: Address,
        token_id: u128,
        implementation_hash: BytesN<32>,
        salt: BytesN<32>,
    ) -> Result<(), Error> {
        upg::require_not_paused(&env);
        // Prevent re-initialization
        if is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }

        // STORAGE: pack the four immutable fields into a single instance
        // entry. Replaces 5 separate writes (TokenContract, TokenId,
        // ImplementationHash, Salt, Initialized) with 1.
        let config = TbaConfig {
            token_contract: token_contract.clone(),
            token_id,
            implementation_hash,
            salt,
        };
        set_config(&env, &config);

        // The NFT owner at initialization time becomes the upgrade admin
        let owner = get_nft_owner(&env, &token_contract, token_id);
        upg::set_admin(&env, &owner);
        upg::init_version(&env);

        // Extend instance TTL
        upg::extend_instance_ttl(&env);

        Ok(())
    }

    /// Get the NFT contract address
    pub fn token_contract(env: Env) -> Result<Address, Error> {
        get_token_contract(&env)
    }

    /// Get the token ID
    pub fn token_id(env: Env) -> Result<u128, Error> {
        get_token_id(&env)
    }

    /// Get the current owner of the NFT (by querying the NFT contract)
    pub fn owner(env: Env) -> Result<Address, Error> {
        let token_contract = get_token_contract(&env)?;
        let token_id = get_token_id(&env)?;
        Ok(get_nft_owner(&env, &token_contract, token_id))
    }

    /// Get token details as a tuple: (chain_id, token_contract, token_id)
    /// This matches the ERC-6551 pattern for compatibility
    /// Note: chain_id is set to 0 as Soroban doesn't expose chain_id in the same way
    pub fn token(env: Env) -> Result<(u32, Address, u128), Error> {
        // Soroban doesn't have chain_id exposed, using 0 as placeholder
        // In production, this could be set during initialization
        let chain_id = 0u32;
        let token_contract = get_token_contract(&env)?;
        let token_id = get_token_id(&env)?;
        Ok((chain_id, token_contract, token_id))
    }

    /// Get the current nonce
    pub fn nonce(env: Env) -> u64 {
        get_nonce(&env)
    }

    /// Execute a transaction to another contract
    /// Only the current NFT owner can execute transactions
    /// This function increments the nonce and emits an event
    pub fn execute(env: Env, to: Address, func: Symbol, args: Vec<Val>) -> Result<Vec<Val>, Error> {
        upg::require_not_paused(&env);
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        let token_contract = get_token_contract(&env)?;
        let token_id = get_token_id(&env)?;
        let owner = get_nft_owner(&env, &token_contract, token_id);

        owner.require_auth();

        let nonce = increment_nonce(&env);

        upg::extend_instance_ttl(&env);

        let event = TransactionExecutedEvent {
            contract_address: env.current_contract_address(),
            to: to.clone(),
            func: func.clone(),
            nonce,
        };
        env.events().publish(
            (Symbol::new(&env, "TransactionExecuted"),),
            event,
        );

        Ok(env.invoke_contract::<Vec<Val>>(&to, &func, args))
    }

    pub fn transfer_token(
        env: Env,
        token_address: Address,
        to: Address,
        amount: i128,
    ) -> Result<(), Error> {
        upg::require_not_paused(&env);
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        let token_contract = get_token_contract(&env)?;
        let token_id = get_token_id(&env)?;
        let owner = get_nft_owner(&env, &token_contract, token_id);

        owner.require_auth();

        let from = env.current_contract_address();
        asset_transfer::transfer_token(&env, &token_address, &from, &to, amount)
            .map_err(|_| Error::NotInitialized)
    }

    pub fn transfer_nft(
        env: Env,
        nft_contract: Address,
        to: Address,
        nft_token_id: u128,
    ) -> Result<(), Error> {
        upg::require_not_paused(&env);
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        let token_contract = get_token_contract(&env)?;
        let token_id = get_token_id(&env)?;
        let owner = get_nft_owner(&env, &token_contract, token_id);

        owner.require_auth();

        let from = env.current_contract_address();
        asset_transfer::transfer_nft(&env, &nft_contract, &from, &to, nft_token_id)
            .map_err(|_| Error::NotInitialized)
    }

    pub fn batch_transfer(
        env: Env,
        token_address: Address,
        recipients: Vec<(Address, i128)>,
    ) -> Result<u32, Error> {
        upg::require_not_paused(&env);
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        let token_contract = get_token_contract(&env)?;
        let token_id = get_token_id(&env)?;
        let owner = get_nft_owner(&env, &token_contract, token_id);

        owner.require_auth();

        let from = env.current_contract_address();
        asset_transfer::batch_transfer_tokens(&env, &token_address, &from, recipients)
            .map_err(|_| Error::NotInitialized)
    }

    pub fn get_balance(env: Env, token_address: Address) -> i128 {
        let account = env.current_contract_address();
        asset_transfer::get_token_balance(&env, &token_address, &account)
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

    /// CustomAccountInterface implementation: Check authorization
    /// Only the current NFT owner can authorize transactions
    pub fn __check_auth(
        env: Env,
        signature_payload: BytesN<32>,
        signatures: Vec<BytesN<64>>,
        auth_context: Vec<Context>,
    ) -> Result<(), Error> {
        // Get the NFT contract and token ID
        let token_contract = get_token_contract(&env)?;
        let token_id = get_token_id(&env)?;

        // Get the current owner of the NFT
        let owner = get_nft_owner(&env, &token_contract, token_id);

        // Verify that the owner has authorized this transaction
        // The require_auth_for_args will check if the owner has signed
        owner.require_auth_for_args(soroban_sdk::vec![
            &env,
            Val::from(signature_payload),
            Val::from(signatures),
            Val::from(auth_context),
        ]);

        Ok(())
    }
}

#[cfg(test)]
mod test;
