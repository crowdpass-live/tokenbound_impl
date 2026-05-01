//! # RBAC Integration Module
//!
//! Provides a bridge between the legacy admin pattern and the new RBAC system.
//! This module allows contracts to gradually migrate to RBAC while maintaining
//! backward compatibility.
//!
//! ## Usage
//!
//! ```rust,ignore
//! use access_control::rbac_integration::{RbacContract, RbacConfig};
//!
//! // In your contract initialization:
//! let config = RbacConfig {
//!     admin: admin_address,
//!     enable_rbac: true,
//! };
//! rbac_integration::initialize(&env, &config);
//!
//! // In your admin functions:
//! pub fn sensitive_operation(env: Env, caller: Address) {
//!     rbac_integration::require_admin_or_role(&env, &caller, &Role::Manager);
//!     // Perform operation
//! }
//! ```

use soroban_sdk::{Address, Env};

use crate::{has_role, initialize as rbac_init, require_role_auth, Role, AccessControlError};
use upgradeable as upg;

/// Configuration for RBAC initialization
#[derive(Clone, Debug)]
pub struct RbacConfig {
    /// The initial admin address
    pub admin: Address,
    /// Whether to enable full RBAC (true) or just legacy admin (false)
    pub enable_rbac: bool,
}

/// Initialize the contract with RBAC support
/// This sets up both the legacy admin system and the new RBAC system
pub fn initialize(env: &Env, config: &RbacConfig) -> Result<(), AccessControlError> {
    // Set up legacy admin system (for backward compatibility)
    upg::set_admin(env, &config.admin);
    upg::init_version(env);

    // Set up RBAC system
    if config.enable_rbac {
        rbac_init(env, &config.admin)?;
    }
    Ok(())
}

/// Require that the caller is either the admin or has the specified role
pub fn require_admin_or_role(env: &Env, caller: &Address, role: &Role) -> Result<(), AccessControlError> {
    let is_authorized = upg::get_admin(env) == *caller || has_role(env, role, caller);
    
    if !is_authorized {
        // Try to check if caller has the role through RBAC
        require_role_auth(env, role, caller)?;
    } else {
        caller.require_auth();
    }
    Ok(())
}

/// Require that the caller has admin privileges (either legacy admin or RBAC admin)
pub fn require_any_admin(env: &Env, caller: &Address) -> Result<(), AccessControlError> {
    let is_authorized = upg::get_admin(env) == *caller || has_role(env, &Role::Admin, caller);
    
    if !is_authorized {
        return Err(AccessControlError::NotAuthorized);
    }
    caller.require_auth();
    Ok(())
}

/// Check if an address has admin privileges
pub fn is_any_admin(env: &Env, account: &Address) -> bool {
    upg::get_admin(env) == *account || has_role(env, &Role::Admin, account)
}

/// Grant a role using admin privileges (works with both legacy and RBAC admin)
pub fn grant_role_with_admin(env: &Env, role: &Role, account: &Address, caller: &Address) -> Result<(), AccessControlError> {
    require_any_admin(env, caller)?;
    crate::grant_role(env, role, account, caller)
}

/// Revoke a role using admin privileges (works with both legacy and RBAC admin)
pub fn revoke_role_with_admin(env: &Env, role: &Role, account: &Address, caller: &Address) -> Result<(), AccessControlError> {
    require_any_admin(env, caller)?;
    crate::revoke_role(env, role, account, caller)
}

/// Transfer admin rights (updates both legacy and RBAC systems)
pub fn transfer_admin(env: &Env, new_admin: &Address, current_admin: &Address) -> Result<(), AccessControlError> {
    require_any_admin(env, current_admin)?;
    
    // Transfer legacy admin
    upg::transfer_admin(env, new_admin.clone());
    
    // Transfer RBAC admin if RBAC is enabled
    if crate::get_admin(env).is_some() {
        crate::transfer_admin(env, new_admin, current_admin)?;
    }
    Ok(())
}

/// Get the admin address (prefers RBAC, falls back to legacy)
pub fn get_admin(env: &Env) -> Address {
    // Try RBAC admin first
    if let Some(admin) = crate::get_admin(env) {
        return admin;
    }
    
    // Fall back to legacy admin
    upg::get_admin(env)
}

/// Pause the contract (requires Pauser role or admin)
pub fn pause(env: &Env, caller: &Address) -> Result<(), AccessControlError> {
    let is_authorized = upg::get_admin(env) == *caller 
        || has_role(env, &Role::Admin, caller)
        || has_role(env, &Role::Pauser, caller);
    
    if !is_authorized {
        return Err(AccessControlError::CannotPause);
    }
    caller.require_auth();
    
    upg::pause(env);
    Ok(())
}

/// Unpause the contract (requires Pauser role or admin)
pub fn unpause(env: &Env, caller: &Address) -> Result<(), AccessControlError> {
    let is_authorized = upg::get_admin(env) == *caller 
        || has_role(env, &Role::Admin, caller)
        || has_role(env, &Role::Pauser, caller);
    
    if !is_authorized {
        return Err(AccessControlError::CannotUnpause);
    }
    caller.require_auth();
    
    upg::unpause(env);
    Ok(())
}

/// Schedule upgrade (requires Upgrader role or admin)
pub fn schedule_upgrade(env: &Env, caller: &Address, new_wasm_hash: soroban_sdk::BytesN<32>) -> Result<(), AccessControlError> {
    let is_authorized = upg::get_admin(env) == *caller 
        || has_role(env, &Role::Admin, caller)
        || has_role(env, &Role::Upgrader, caller);
    
    if !is_authorized {
        return Err(AccessControlError::CannotUpgrade);
    }
    caller.require_auth();
    
    upg::schedule_upgrade(env, new_wasm_hash);
    Ok(())
}

/// Cancel upgrade (requires Upgrader role or admin)
pub fn cancel_upgrade(env: &Env, caller: &Address) -> Result<(), AccessControlError> {
    let is_authorized = upg::get_admin(env) == *caller 
        || has_role(env, &Role::Admin, caller)
        || has_role(env, &Role::Upgrader, caller);
    
    if !is_authorized {
        return Err(AccessControlError::CannotUpgrade);
    }
    caller.require_auth();
    
    upg::cancel_upgrade(env);
    Ok(())
}

/// Commit upgrade (requires Upgrader role or admin)
pub fn commit_upgrade(env: &Env, caller: &Address) -> Result<(), AccessControlError> {
    let is_authorized = upg::get_admin(env) == *caller 
        || has_role(env, &Role::Admin, caller)
        || has_role(env, &Role::Upgrader, caller);
    
    if !is_authorized {
        return Err(AccessControlError::CannotUpgrade);
    }
    caller.require_auth();
    
    upg::commit_upgrade(env);
    Ok(())
}
