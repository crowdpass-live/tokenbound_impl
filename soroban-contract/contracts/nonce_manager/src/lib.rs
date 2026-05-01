//! Shared nonce tracking utilities for Soroban contracts.
//!
//! These helpers provide a consistent instance-storage nonce counter for
//! replay protection across modules that need monotonically increasing
//! transaction sequencing.

#![no_std]

use soroban_sdk::{contracttype, Env};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum NonceKey {
    Nonce,
}

pub fn get_nonce(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&NonceKey::Nonce)
        .unwrap_or(0u64)
}

pub fn set_nonce(env: &Env, nonce: u64) {
    env.storage().instance().set(&NonceKey::Nonce, &nonce);
}

pub fn increment_nonce(env: &Env) -> u64 {
    let next_nonce = get_nonce(env) + 1;
    set_nonce(env, next_nonce);
    next_nonce
}