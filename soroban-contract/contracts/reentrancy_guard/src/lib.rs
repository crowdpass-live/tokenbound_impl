#![no_std]

use soroban_sdk::{contracterror, contracttype, Env};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    Reentrant = 1,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Locked,
}

pub fn is_locked(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Locked)
        .unwrap_or(false)
}

pub fn enter(env: &Env) -> Result<(), Error> {
    if is_locked(env) {
        return Err(Error::Reentrant);
    }
    env.storage().instance().set(&DataKey::Locked, &true);
    Ok(())
}

pub fn exit(env: &Env) {
    env.storage().instance().set(&DataKey::Locked, &false);
}
