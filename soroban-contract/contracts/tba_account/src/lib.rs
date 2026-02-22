#![no_std]
use soroban_sdk::{
    auth::Context, contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, Symbol,
    Val, Vec,
};

#[contract]
pub struct TbaAccount;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    TokenContract,      // Address of the NFT contract
    TokenId,            // Specific NFT token ID (u128)
    ImplementationHash, // Hash used for deployment (u256)
    Salt,               // Deployment salt (u256)
    Initialized,        // Init flag
    Nonce,              // Transaction nonce counter
}

// Helper functions for storage
fn get_token_contract(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::TokenContract)
        .expect("Contract not initialized")
}

fn set_token_contract(env: &Env, token_contract: &Address) {
    env.storage()
        .instance()
        .set(&DataKey::TokenContract, token_contract);
}

fn get_token_id(env: &Env) -> u128 {
    env.storage()
        .instance()
        .get(&DataKey::TokenId)
        .expect("Contract not initialized")
}

fn set_token_id(env: &Env, token_id: &u128) {
    env.storage().instance().set(&DataKey::TokenId, token_id);
}

fn _get_implementation_hash(env: &Env) -> BytesN<32> {
    env.storage()
        .instance()
        .get(&DataKey::ImplementationHash)
        .expect("Contract not initialized")
}

fn set_implementation_hash(env: &Env, implementation_hash: &BytesN<32>) {
    env.storage()
        .instance()
        .set(&DataKey::ImplementationHash, implementation_hash);
}

fn _get_salt(env: &Env) -> BytesN<32> {
    env.storage()
        .instance()
        .get(&DataKey::Salt)
        .expect("Contract not initialized")
}

fn set_salt(env: &Env, salt: &BytesN<32>) {
    env.storage().instance().set(&DataKey::Salt, salt);
}

fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Initialized)
        .unwrap_or(false)
}

fn set_initialized(env: &Env, initialized: &bool) {
    env.storage()
        .instance()
        .set(&DataKey::Initialized, initialized);
}

fn get_nonce(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::Nonce)
        .unwrap_or(0u64)
}

fn increment_nonce(env: &Env) -> u64 {
    let current_nonce = get_nonce(env);
    let new_nonce = current_nonce + 1;
    env.storage().instance().set(&DataKey::Nonce, &new_nonce);
    new_nonce
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TransactionExecutedEvent {
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
    ) {
        // Prevent re-initialization
        if is_initialized(&env) {
            panic!("Contract already initialized");
        }

        // Store all parameters
        set_token_contract(&env, &token_contract);
        set_token_id(&env, &token_id);
        set_implementation_hash(&env, &implementation_hash);
        set_salt(&env, &salt);
        set_initialized(&env, &true);

        // Extend instance TTL
        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);
    }

    /// Get the NFT contract address
    pub fn token_contract(env: Env) -> Address {
        get_token_contract(&env)
    }

    /// Get the token ID
    pub fn token_id(env: Env) -> u128 {
        get_token_id(&env)
    }

    /// Get the current owner of the NFT (by querying the NFT contract)
    pub fn owner(env: Env) -> Address {
        let token_contract = get_token_contract(&env);
        let token_id = get_token_id(&env);
        get_nft_owner(&env, &token_contract, token_id)
    }

    /// Get token details as a tuple: (chain_id, token_contract, token_id)
    /// This matches the ERC-6551 pattern for compatibility
    /// Note: chain_id is set to 0 as Soroban doesn't expose chain_id in the same way
    pub fn token(env: Env) -> (u32, Address, u128) {
        // Soroban doesn't have chain_id exposed, using 0 as placeholder
        // In production, this could be set during initialization
        let chain_id = 0u32;
        let token_contract = get_token_contract(&env);
        let token_id = get_token_id(&env);
        (chain_id, token_contract, token_id)
    }

    /// Get the current nonce
    pub fn nonce(env: Env) -> u64 {
        get_nonce(&env)
    }

    /// Execute a transaction to another contract
    /// Only the current NFT owner can execute transactions
    /// This function increments the nonce and emits an event
    pub fn execute(env: Env, to: Address, func: Symbol, args: Vec<Val>) -> Vec<Val> {
        // Verify contract is initialized
        if !is_initialized(&env) {
            panic!("Contract not initialized");
        }

        // Get the NFT owner and verify authorization
        let token_contract = get_token_contract(&env);
        let token_id = get_token_id(&env);
        let owner = get_nft_owner(&env, &token_contract, token_id);

        // Require authorization from the NFT owner
        owner.require_auth();

        // Increment nonce
        let nonce = increment_nonce(&env);

        // Extend instance TTL on activity
        env.storage()
            .instance()
            .extend_ttl(30 * 24 * 60 * 60 / 5, 100 * 24 * 60 * 60 / 5);

        // Emit transaction executed event
        let event = TransactionExecutedEvent {
            to: to.clone(),
            func: func.clone(),
            nonce,
        };
        env.events().publish(
            (
                Symbol::new(&env, "executed"),
                Symbol::new(&env, "TransactionExecuted"),
            ),
            event,
        );

        // Invoke the target contract
        env.invoke_contract::<Vec<Val>>(&to, &func, args)
    }

    /// CustomAccountInterface implementation: Check authorization
    /// Only the current NFT owner can authorize transactions
    pub fn __check_auth(
        env: Env,
        signature_payload: BytesN<32>,
        signatures: Vec<BytesN<64>>,
        auth_context: Vec<Context>,
    ) {
        // Get the NFT contract and token ID
        let token_contract = get_token_contract(&env);
        let token_id = get_token_id(&env);

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
    }
}

#[cfg(test)]
mod test;
