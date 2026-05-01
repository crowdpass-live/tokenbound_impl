#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, xdr::ToXdr, Address, Bytes, BytesN, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InvalidAmount = 4,
    InsufficientBalance = 5,
    NoPublicKey = 6,
    PermitExpired = 7,
    InvalidNonce = 8,
    InvalidSignature = 9,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Initialized,
    OwnerKey(Address),
    OwnerNonce(Address),
}

#[contract]
pub struct PermitWallet;

fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Initialized)
        .unwrap_or(false)
}

fn set_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

fn load_owner_key(env: &Env, owner: &Address) -> Option<BytesN<32>> {
    env.storage().persistent().get(&DataKey::OwnerKey(owner.clone()))
}

fn get_owner_nonce(env: &Env, owner: &Address) -> u64 {
    env.storage()
        .persistent()
        .get(&DataKey::OwnerNonce(owner.clone()))
        .unwrap_or(0u64)
}

fn set_owner_nonce(env: &Env, owner: &Address, nonce: u64) {
    env.storage()
        .persistent()
        .set(&DataKey::OwnerNonce(owner.clone()), &nonce);
}

fn build_permit_payload(
    env: &Env,
    contract: &Address,
    owner: &Address,
    token: &Address,
    to: &Address,
    amount: i128,
    deadline: u32,
    nonce: u64,
) -> Bytes {
    let mut payload = Bytes::new(env);
    payload.append(&contract.to_xdr(env));
    payload.append(&owner.to_xdr(env));
    payload.append(&token.to_xdr(env));
    payload.append(&to.to_xdr(env));
    payload.extend_from_array(&amount.to_be_bytes());
    payload.extend_from_array(&deadline.to_be_bytes());
    payload.extend_from_array(&nonce.to_be_bytes());
    payload
}

#[contractimpl]
impl PermitWallet {
    pub fn initialize(env: Env) -> Result<(), Error> {
        if is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }

        set_initialized(&env);
        Ok(())
    }

    pub fn register_owner_key(
        env: Env,
        owner: Address,
        public_key: BytesN<32>,
    ) -> Result<(), Error> {
        owner.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::OwnerKey(owner.clone()), &public_key);
        Ok(())
    }

    pub fn get_owner_key(env: Env, owner: Address) -> Result<BytesN<32>, Error> {
        load_owner_key(&env, &owner).ok_or(Error::NoPublicKey)
    }

    pub fn permit_transfer(
        env: Env,
        owner: Address,
        token: Address,
        to: Address,
        amount: i128,
        deadline: u32,
        nonce: u64,
        signature: BytesN<64>,
    ) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if env.ledger().sequence() > deadline {
            return Err(Error::PermitExpired);
        }

        let public_key = load_owner_key(&env, &owner).ok_or(Error::NoPublicKey)?;
        let current_nonce = get_owner_nonce(&env, &owner);
        if nonce != current_nonce {
            return Err(Error::InvalidNonce);
        }

        let contract_address = env.current_contract_address();
        let payload = build_permit_payload(
            &env,
            &contract_address,
            &owner,
            &token,
            &to,
            amount,
            deadline,
            nonce,
        );

        env.crypto()
            .ed25519_verify(&public_key, &payload, &signature);

        set_owner_nonce(&env, &owner, nonce + 1);

        let from = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);
        let balance = token_client.balance(&from);
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        token_client.transfer(&from, &to, &amount);
        Ok(())
    }

    pub fn owner_nonce(env: Env, owner: Address) -> u64 {
        get_owner_nonce(&env, &owner)
    }
}

#[cfg(test)]
mod test;
