#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    AlreadyAdmin = 4,
    AdminNotFound = 5,
    CannotRemoveLastAdmin = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Role {
    Admin,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Initialized,
    Admins,
}

fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Initialized)
        .unwrap_or(false)
}

fn set_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

fn load_admins(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::Admins)
        .unwrap_or_else(|| Vec::new(env))
}

fn save_admins(env: &Env, admins: &Vec<Address>) {
    env.storage().instance().set(&DataKey::Admins, admins);
}

fn is_admin(env: &Env, address: &Address) -> bool {
    let admins = load_admins(env);
    let count = admins.len();
    for i in 0..count {
        let candidate = admins.get(i).unwrap();
        if candidate == *address {
            return true;
        }
    }
    false
}

fn find_admin_index(admins: &Vec<Address>, address: &Address) -> Option<u32> {
    let len = admins.len();
    for i in 0..len {
        let candidate = admins.get(i).unwrap();
        if candidate == *address {
            return Some(i);
        }
    }
    None
}

fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
    (*caller).require_auth();
    if !is_admin(env, caller) {
        return Err(Error::Unauthorized);
    }
    Ok(())
}

#[contract]
pub struct MultiAdmin;

#[contractimpl]
impl MultiAdmin {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        let mut admins = Vec::new(&env);
        admins.push_back(admin.clone());
        save_admins(&env, &admins);
        set_initialized(&env);

        Ok(())
    }

    pub fn grant_admin(
        env: Env,
        caller: Address,
        new_admin: Address,
    ) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        require_admin(&env, &caller)?;
        if is_admin(&env, &new_admin) {
            return Err(Error::AlreadyAdmin);
        }

        let mut admins = load_admins(&env);
        admins.push_back(new_admin);
        save_admins(&env, &admins);

        Ok(())
    }

    pub fn revoke_admin(
        env: Env,
        caller: Address,
        admin_to_remove: Address,
    ) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        require_admin(&env, &caller)?;
        let mut admins = load_admins(&env);
        let index = find_admin_index(&admins, &admin_to_remove)
            .ok_or(Error::AdminNotFound)?;

        if admins.len() <= 1 {
            return Err(Error::CannotRemoveLastAdmin);
        }

        admins.remove(index);
        save_admins(&env, &admins);

        Ok(())
    }

    pub fn renounce_admin(env: Env, caller: Address) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        caller.require_auth();

        let mut admins = load_admins(&env);
        let index = find_admin_index(&admins, &caller)
            .ok_or(Error::AdminNotFound)?;

        if admins.len() <= 1 {
            return Err(Error::CannotRemoveLastAdmin);
        }

        admins.remove(index);
        save_admins(&env, &admins);

        Ok(())
    }

    pub fn is_admin(env: Env, address: Address) -> bool {
        is_admin(&env, &address)
    }

    pub fn get_admins(env: Env) -> Vec<Address> {
        load_admins(&env)
    }
}

#[cfg(test)]
mod test;
