//! # Role-Based Access Control (RBAC) Library
//!
//! Provides granular role-based permissions for Soroban smart contracts.
//!
//! ## Roles
//!
//! - **Admin** - Full contract control, can grant/revoke roles
//! - **Upgrader** - Can schedule and commit contract upgrades
//! - **Pauser** - Can pause and unpause contract operations
//! - **Manager** - Can perform general management tasks
//! - **Minter** - Can mint new tokens/tickets
//! - **Organizer** - Can manage event-related functions
//! - **PaymentReleaser** - Can trigger payment releases
//!
//! ## Modules
//!
//! - `rbac_integration` - Integration helpers for bridging legacy admin pattern with RBAC
//!
//! ## Usage
//!
//! ```rust,ignore
//! use access_control::{Role, require_role, has_role, grant_role, revoke_role};
//!
//! // Check if caller has a specific role
//! require_role(&env, &Role::Admin);
//!
//! // Grant a role to an address
//! grant_role(&env, &Role::Manager, &new_manager);
//!
//! // Revoke a role
//! revoke_role(&env, &Role::Manager, &old_manager);
//!
//! // Check if address has a role
//! if has_role(&env, &Role::Minter, &address) {
//!     // Perform minting
//! }
//! ```

#![no_std]

use soroban_sdk::{contracterror, contracttype, symbol_short, Address, Env, Symbol};

pub mod rbac_integration;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum AccessControlError {
    MissingRequiredRole = 1,
    AlreadyInitialized = 2,
    NotAuthorized = 3,
    CannotPause = 4,
    CannotUnpause = 5,
    CannotUpgrade = 6,
}

// ── Role Definition ────────────────────────────────────────────────────────────

/// Roles for access control
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq, Copy)]
pub enum Role {
    /// Super admin - can perform any action and manage roles
    Admin,
    /// Can schedule and commit contract upgrades
    Upgrader,
    /// Can pause and unpause the contract
    Pauser,
    /// General manager - can perform day-to-day operations
    Manager,
    /// Can mint new tokens/tickets
    Minter,
    /// Can manage event-related functions
    Organizer,
    /// Can trigger payment releases
    PaymentReleaser,
}

/// Storage key for role data
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AccessControlKey {
    /// Whether an address has a specific role: (Role, Address) -> bool
    HasRole(Role, Address),
    /// The admin address (single source of truth for admin)
    Admin,
}

// ── Event Types ────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleGrantedEvent {
    pub role: Symbol,
    pub account: Address,
    pub sender: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleRevokedEvent {
    pub role: Symbol,
    pub account: Address,
    pub sender: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RoleAdminChangedEvent {
    pub old_admin: Address,
    pub new_admin: Address,
}

// ── Internal Helpers ───────────────────────────────────────────────────────

fn role_to_symbol(role: &Role) -> Symbol {
    match role {
        Role::Admin => symbol_short!("ADMIN"),
        Role::Upgrader => symbol_short!("UPGRADER"),
        Role::Pauser => symbol_short!("PAUSER"),
        Role::Manager => symbol_short!("MANAGER"),
        Role::Minter => symbol_short!("MINTER"),
        Role::Organizer => symbol_short!("ORGANIZER"),
        Role::PaymentReleaser => symbol_short!("RELEASER"),
    }
}

fn storage_key(role: &Role, account: &Address) -> AccessControlKey {
    AccessControlKey::HasRole(role.clone(), account.clone())
}

// ── Public API ─────────────────────────────────────────────────────────────

/// Check if an account has a specific role
pub fn has_role(env: &Env, role: &Role, account: &Address) -> bool {
    env.storage()
        .instance()
        .get(&storage_key(role, account))
        .unwrap_or(false)
}

/// Check if an account has any of the specified roles
pub fn has_any_role(env: &Env, roles: &[Role], account: &Address) -> bool {
    roles.iter().any(|role| has_role(env, role, account))
}

/// Require that the caller has a specific role
/// Panics with "missing role" if not authorized
pub fn require_role(env: &Env, role: &Role) {
    // Get the invoker (the account that signed the transaction)
    // For external calls, we need to use require_auth on the address
    // This function should be called after require_auth on the caller
    assert!(
        has_role(env, role, &env.current_contract_address()),
        "missing role"
    );
}

/// Require that the caller has a specific role (with proper auth check)
/// This is the main function to use - it checks both authentication and authorization
pub fn require_role_auth(env: &Env, role: &Role, account: &Address) -> Result<(), AccessControlError> {
    account.require_auth();
    if !has_role(env, role, account) {
        return Err(AccessControlError::MissingRequiredRole);
    }
    Ok(())
}

/// Require that the caller has any of the specified roles
pub fn require_any_role_auth(env: &Env, roles: &[Role], account: &Address) -> Result<(), AccessControlError> {
    account.require_auth();
    if !has_any_role(env, roles, account) {
        return Err(AccessControlError::MissingRequiredRole);
    }
    Ok(())
}

/// Grant a role to an account
/// Only the admin can grant roles
pub fn grant_role(env: &Env, role: &Role, account: &Address, sender: &Address) -> Result<(), AccessControlError> {
    // Only admin can grant roles
    require_role_auth(env, &Role::Admin, sender)?;

    let key = storage_key(role, account);
    env.storage().instance().set(&key, &true);

    // Emit event
    let event = RoleGrantedEvent {
        role: role_to_symbol(role),
        account: account.clone(),
        sender: sender.clone(),
    };
    env.events().publish(
        (symbol_short!("rbac"), Symbol::new(env, "RoleGranted")),
        event,
    );
    Ok(())
}

/// Revoke a role from an account
/// Only the admin can revoke roles
pub fn revoke_role(env: &Env, role: &Role, account: &Address, sender: &Address) -> Result<(), AccessControlError> {
    // Only admin can revoke roles
    require_role_auth(env, &Role::Admin, sender)?;

    let key = storage_key(role, account);
    env.storage().instance().remove(&key);

    // Emit event
    let event = RoleRevokedEvent {
        role: role_to_symbol(role),
        account: account.clone(),
        sender: sender.clone(),
    };
    env.events().publish(
        (symbol_short!("rbac"), Symbol::new(env, "RoleRevoked")),
        event,
    );
    Ok(())
}

/// Renounce a role (self-revoke)
/// The account must have the role and must authorize the transaction
pub fn renounce_role(env: &Env, role: &Role, account: &Address) -> Result<(), AccessControlError> {
    account.require_auth();
    
    if !has_role(env, role, account) {
        return Err(AccessControlError::MissingRequiredRole);
    }

    let key = storage_key(role, account);
    env.storage().instance().remove(&key);

    // Emit event
    let event = RoleRevokedEvent {
        role: role_to_symbol(role),
        account: account.clone(),
        sender: account.clone(),
    };
    env.events().publish(
        (symbol_short!("rbac"), Symbol::new(env, "RoleRevoked")),
        event,
    );
    Ok(())
}

/// Internal: Set admin without auth check (for use after auth already verified)
fn _set_admin_internal(env: &Env, admin: &Address) {
    // Revoke admin role from old admin if exists
    if let Some(current_admin) = env.storage().instance().get::<_, Address>(&AccessControlKey::Admin) {
        let old_key = storage_key(&Role::Admin, &current_admin);
        env.storage().instance().remove(&old_key);
        
        let event = RoleAdminChangedEvent {
            old_admin: current_admin,
            new_admin: admin.clone(),
        };
        env.events().publish(
            (symbol_short!("rbac"), Symbol::new(env, "AdminChanged")),
            event,
        );
    }

    // Store new admin
    env.storage().instance().set(&AccessControlKey::Admin, admin);
    
    // Grant admin role to new admin
    let admin_key = storage_key(&Role::Admin, admin);
    env.storage().instance().set(&admin_key, &true);
}

/// Set the admin address
/// Can only be called during initialization or by current admin
pub fn set_admin(env: &Env, admin: &Address, sender: Option<&Address>) -> Result<(), AccessControlError> {
    // Check auth if there's already an admin (not initialization)
    if env.storage().instance().has(&AccessControlKey::Admin) {
        if let Some(sender_addr) = sender {
            require_role_auth(env, &Role::Admin, sender_addr)?;
        }
    }
    
    _set_admin_internal(env, admin);
    Ok(())
}

/// Get the current admin address
pub fn get_admin(env: &Env) -> Option<Address> {
    env.storage().instance().get(&AccessControlKey::Admin)
}

/// Check if an account is the admin
pub fn is_admin(env: &Env, account: &Address) -> bool {
    has_role(env, &Role::Admin, account)
}

/// Initialize the RBAC system with a default admin
/// This should be called during contract initialization
pub fn initialize(env: &Env, admin: &Address) -> Result<(), AccessControlError> {
    if get_admin(env).is_some() {
        return Err(AccessControlError::AlreadyInitialized);
    }
    
    set_admin(env, admin, None)?;
    
    // Grant full set of roles to admin by default
    let roles = [
        Role::Upgrader,
        Role::Pauser,
        Role::Manager,
        Role::Minter,
        Role::Organizer,
        Role::PaymentReleaser,
    ];
    
    for role in roles.iter() {
        let key = storage_key(role, admin);
        env.storage().instance().set(&key, &true);
        
        let event = RoleGrantedEvent {
            role: role_to_symbol(role),
            account: admin.clone(),
            sender: admin.clone(),
        };
        env.events().publish(
            (symbol_short!("rbac"), Symbol::new(env, "RoleGranted")),
            event,
        );
    }
    Ok(())
}

/// Transfer admin role to a new address
pub fn transfer_admin(env: &Env, new_admin: &Address, current_admin: &Address) -> Result<(), AccessControlError> {
    require_role_auth(env, &Role::Admin, current_admin)?;
    
    // Use internal helper to avoid double auth check
    _set_admin_internal(env, new_admin);
    
    // Grant all roles to new admin
    let roles = [
        Role::Upgrader,
        Role::Pauser,
        Role::Manager,
        Role::Minter,
        Role::Organizer,
        Role::PaymentReleaser,
    ];
    
    for role in roles.iter() {
        let key = storage_key(role, new_admin);
        if !has_role(env, role, new_admin) {
            env.storage().instance().set(&key, &true);
        }
    }
    Ok(())
}

/// Get all roles that an account has (for query purposes)
/// Returns a vector of role symbols
pub fn get_account_roles(env: &Env, account: &Address) -> soroban_sdk::Vec<Symbol> {
    let all_roles = [
        Role::Admin,
        Role::Upgrader,
        Role::Pauser,
        Role::Manager,
        Role::Minter,
        Role::Organizer,
        Role::PaymentReleaser,
    ];
    
    let mut result = soroban_sdk::Vec::new(env);
    for role in all_roles.iter() {
        if has_role(env, role, account) {
            result.push_back(role_to_symbol(role));
        }
    }
    result
}

#[cfg(test)]
mod test;
