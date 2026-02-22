#![no_std]
use soroban_sdk::xdr::ToXdr;
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, Symbol, Val, Vec,
};

/// Storage keys for the registry contract
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// WASM hash of the TBA Account contract implementation
    ImplementationWasmHash,
    /// Mapping from (implementation_hash, token_contract, token_id, salt) -> deployed_address
    /// We use a composite key to store the deployed address
    DeployedAccount(BytesN<32>, Address, u128, BytesN<32>),
    /// Count of deployed accounts per NFT: (token_contract, token_id) -> count
    AccountCount(Address, u128),
}

/// TBA Registry Contract
///
/// Factory contract that creates and tracks Token Bound Account (TBA) instances.
/// Each TBA is deterministically deployed and can be calculated before deployment.
#[contract]
pub struct TbaRegistry;

#[contractimpl]
impl TbaRegistry {
    /// Initialize the registry with the TBA Account WASM hash
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `tba_account_wasm_hash` - WASM hash of the TBA Account contract to deploy
    pub fn __constructor(env: Env, tba_account_wasm_hash: BytesN<32>) {
        env.storage()
            .instance()
            .set(&DataKey::ImplementationWasmHash, &tba_account_wasm_hash);

        // Extend instance TTL
        env.storage().instance().extend_ttl(
            30 * 24 * 60 * 60 / 5,  // ~30 days
            100 * 24 * 60 * 60 / 5, // ~100 days
        );
    }

    /// Calculate the deterministic address for a TBA account
    ///
    /// This function computes the address that would be returned by `create_account()`
    /// for the same inputs. In Soroban, the deployer creates deterministic addresses,
    /// so we can calculate this by using the deployer's address computation.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `implementation_hash` - Hash of the TBA account implementation (u256 as BytesN<32>)
    /// * `token_contract` - Address of the NFT contract
    /// * `token_id` - Token ID of the NFT (u128)
    /// * `salt` - Deployment salt (u256 as BytesN<32>)
    ///
    /// # Returns
    /// The deterministic address where the TBA account would be deployed
    pub fn get_account(
        env: Env,
        implementation_hash: BytesN<32>,
        token_contract: Address,
        token_id: u128,
        salt: BytesN<32>,
    ) -> Address {
        // First, check if the account has already been deployed
        // If so, return the stored address (most accurate)
        let account_key = DataKey::DeployedAccount(
            implementation_hash.clone(),
            token_contract.clone(),
            token_id,
            salt.clone(),
        );

        let deployed_account: Option<Address> = env.storage().persistent().get(&account_key);
        if let Some(deployed_addr) = deployed_account {
            // Extend persistent TTL on read
            env.storage().persistent().extend_ttl(
                &account_key,
                30 * 24 * 60 * 60 / 5,
                100 * 24 * 60 * 60 / 5,
            );
            return deployed_addr;
        }

        // If not deployed yet, compute the expected address using the deployer
        // Create a composite salt from all parameters to ensure uniqueness
        let composite_salt =
            compute_composite_salt(&env, &implementation_hash, &token_contract, token_id, &salt);

        // Use the deployer to compute the contract address without deploying
        // This is the CORRECT way to get the deterministic address
        env.deployer()
            .with_current_contract(composite_salt)
            .deployed_address()
    }

    /// Deploy a new TBA account contract and initialize it
    ///
    /// This function deploys a TBA account for an NFT and initializes it with the
    /// NFT ownership details. The deployed address is deterministic and matches
    /// what `get_account()` would return for the same inputs.
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `implementation_hash` - Hash of the TBA account implementation (u256 as BytesN<32>)
    /// * `token_contract` - Address of the NFT contract
    /// * `token_id` - Token ID of the NFT (u128)
    /// * `salt` - Deployment salt (u256 as BytesN<32>)
    ///
    /// # Returns
    /// The address of the newly deployed TBA account
    ///
    /// # Panics
    /// Panics if the account has already been deployed for these parameters
    pub fn create_account(
        env: Env,
        implementation_hash: BytesN<32>,
        token_contract: Address,
        token_id: u128,
        salt: BytesN<32>,
    ) -> Address {
        // Verify that the caller owns the NFT (Issue #26)
        // This is a cross-contract call to the NFT contract
        let owner: Address = env.invoke_contract(
            &token_contract,
            &Symbol::new(&env, "owner_of"),
            soroban_sdk::vec![&env, token_id.into_val(&env)],
        );
        owner.require_auth();

        // Check if account already exists
        let account_key = DataKey::DeployedAccount(
            implementation_hash.clone(),
            token_contract.clone(),
            token_id,
            salt.clone(),
        );

        if env.storage().persistent().has(&account_key) {
            panic!("Account already deployed for these parameters");
        }

        // Get the WASM hash from storage
        let wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::ImplementationWasmHash)
            .expect("Registry not initialized");

        // Create the same composite salt used in get_account()
        let composite_salt =
            compute_composite_salt(&env, &implementation_hash, &token_contract, token_id, &salt);

        // Prepare constructor arguments for the TBA Account contract
        let constructor_args: Vec<Val> = Vec::new(&env);

        // Deploy the TBA account using Soroban's deployer pattern
        // This creates a deterministic address based on deployer + salt + wasm_hash
        let deployed_address = env
            .deployer()
            .with_current_contract(composite_salt)
            .deploy_v2(wasm_hash, constructor_args);

        // Initialize the deployed TBA account with NFT details
        let init_args = soroban_sdk::vec![
            &env,
            token_contract.clone().into_val(&env),
            token_id.into_val(&env),
            implementation_hash.clone().into_val(&env),
            salt.clone().into_val(&env),
        ];
        env.invoke_contract::<()>(
            &deployed_address,
            &Symbol::new(&env, "initialize"),
            init_args,
        );

        // Store the mapping in persistent storage
        env.storage()
            .persistent()
            .set(&account_key, &deployed_address);

        // Extend persistent TTL
        env.storage().persistent().extend_ttl(
            &account_key,
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        // Increment and store the account count for this NFT
        let count_key = DataKey::AccountCount(token_contract.clone(), token_id);
        let current_count: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        let new_count = current_count + 1;
        env.storage().persistent().set(&count_key, &new_count);

        // Extend persistent TTL for count
        env.storage().persistent().extend_ttl(
            &count_key,
            30 * 24 * 60 * 60 / 5,
            100 * 24 * 60 * 60 / 5,
        );

        deployed_address
    }

    /// Get the total number of TBA accounts deployed for a specific NFT
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `token_contract` - Address of the NFT contract
    /// * `token_id` - Token ID of the NFT
    ///
    /// # Returns
    /// The number of TBA accounts that have been deployed for this NFT
    pub fn total_deployed_accounts(env: Env, token_contract: Address, token_id: u128) -> u32 {
        let count_key = DataKey::AccountCount(token_contract, token_id);
        env.storage().persistent().get(&count_key).unwrap_or(0)
    }

    /// Get the deployed address for specific parameters (if it exists)
    ///
    /// # Arguments
    /// * `env` - The contract environment
    /// * `implementation_hash` - Hash of the TBA account implementation
    /// * `token_contract` - Address of the NFT contract
    /// * `token_id` - Token ID of the NFT
    /// * `salt` - Deployment salt
    ///
    /// # Returns
    /// Some(address) if the account has been deployed, None otherwise
    pub fn get_deployed_address(
        env: Env,
        implementation_hash: BytesN<32>,
        token_contract: Address,
        token_id: u128,
        salt: BytesN<32>,
    ) -> Option<Address> {
        let account_key =
            DataKey::DeployedAccount(implementation_hash, token_contract, token_id, salt);
        env.storage().persistent().get(&account_key)
    }
}

/// Compute a composite salt from all TBA parameters
///
/// This ensures that the address calculation is deterministic and unique
/// for each combination of (implementation_hash, token_contract, token_id, salt).
fn compute_composite_salt(
    env: &Env,
    implementation_hash: &BytesN<32>,
    token_contract: &Address,
    token_id: u128,
    salt: &BytesN<32>,
) -> BytesN<32> {
    // Create a deterministic hash from all parameters
    // We'll serialize: impl_hash (32) + token_contract + token_id (16) + salt (32)

    let impl_bytes = implementation_hash.to_array();
    let salt_bytes = salt.to_array();

    // Convert token_contract address to bytes
    // We'll serialize the address using the SDK's serialization
    let token_contract_bytes = token_contract.to_xdr(env);
    let token_contract_hash = env.crypto().sha256(&token_contract_bytes);
    let token_contract_hash_array: [u8; 32] = token_contract_hash.into();

    // Convert token_id to bytes (u128 = 16 bytes)
    let token_id_bytes = token_id.to_be_bytes();

    // Combine all parameters
    let mut combined = soroban_sdk::Bytes::new(env);
    combined.extend_from_array(&impl_bytes);
    combined.extend_from_array(&token_contract_hash_array);
    combined.extend_from_array(&token_id_bytes);
    combined.extend_from_array(&salt_bytes);

    // Hash the combined bytes to create final composite salt
    let hash = env.crypto().sha256(&combined);
    hash.into()
}

#[cfg(test)]
mod test;
