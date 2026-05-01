# Role-Based Access Control (RBAC) for Soroban Contracts

A comprehensive RBAC library for Soroban smart contracts that provides granular permission management for contract administration functions.

## Overview

This library provides role-based access control for sensitive contract administration functions. It allows contracts to define multiple roles with specific permissions and manage them dynamically.

## Features

- **Multiple Roles**: Admin, Upgrader, Pauser, Manager, Minter, Organizer, PaymentReleaser
- **Dynamic Role Management**: Grant and revoke roles at runtime
- **Backward Compatibility**: Integration helpers for legacy admin patterns
- **Event Emissions**: All role changes emit events for auditability
- **Self-Renouncement**: Accounts can renounce their own roles
- **Batch Role Queries**: Query all roles for an account in one call

## Roles

| Role | Description | Typical Use |
|------|-------------|-------------|
| `Admin` | Full contract control, can grant/revoke roles | Contract owner |
| `Upgrader` | Can schedule and commit contract upgrades | DevOps/Technical |
| `Pauser` | Can pause and unpause contract operations | Emergency response |
| `Manager` | Can perform general management tasks | Day-to-day operations |
| `Minter` | Can mint new tokens/tickets | Token issuance |
| `Organizer` | Can manage event-related functions | Event management |
| `PaymentReleaser` | Can trigger payment releases | Treasury operations |

## Usage

### Basic RBAC Setup

```rust
use access_control::{Role, initialize, grant_role, has_role, require_role_auth};

// In your contract initialization:
pub fn initialize(env: Env, admin: Address) {
    access_control::initialize(&env, &admin);
    // Admin now has all roles including Admin role
}

// In your admin functions:
pub fn sensitive_operation(env: Env, caller: Address) {
    // Require caller to have Manager role
    require_role_auth(&env, &Role::Manager, &caller);
    
    // Perform operation...
}
```

### Granting and Revoking Roles

```rust
use access_control::{grant_role, revoke_role, Role};

// Grant Manager role to a new address (only admin can do this)
pub fn add_manager(env: Env, caller: Address, new_manager: Address) {
    grant_role(&env, &Role::Manager, &new_manager, &caller);
}

// Revoke Manager role (only admin can do this)
pub fn remove_manager(env: Env, caller: Address, manager: Address) {
    revoke_role(&env, &Role::Manager, &manager, &caller);
}

// Renounce own role (self-service)
pub fn leave_manager_role(env: Env, caller: Address) {
    renounce_role(&env, &Role::Manager, &caller);
}
```

### Checking Roles

```rust
use access_control::{has_role, has_any_role, Role, get_account_roles};

// Check if account has a specific role
if has_role(&env, &Role::Minter, &account) {
    // Perform minting
}

// Check if account has any of multiple roles
let roles = [Role::Manager, Role::Admin];
if has_any_role(&env, &roles, &account) {
    // Allow operation
}

// Get all roles for an account
let roles = get_account_roles(&env, &account);
```

## Integration with Legacy Admin Pattern

For contracts already using the `upgradeable` library's admin pattern, use the `rbac_integration` module:

```rust
use access_control::rbac_integration::{self, RbacConfig};

// In initialization:
pub fn __constructor(env: Env, admin: Address) {
    let config = RbacConfig {
        admin,
        enable_rbac: true,
    };
    rbac_integration::initialize(&env, &config);
}

// For admin functions, accept both legacy admin and RBAC roles:
pub fn pause_contract(env: Env, caller: Address) {
    rbac_integration::pause(&env, &caller);
}

pub fn schedule_upgrade(env: Env, caller: Address, new_wasm_hash: BytesN<32>) {
    rbac_integration::schedule_upgrade(&env, &caller, new_wasm_hash);
}
```

## Events

The library emits the following events:

### RoleGranted
```
Topics: ["rbac", "RoleGranted"]
Data: { role: Symbol, account: Address, sender: Address }
```

### RoleRevoked
```
Topics: ["rbac", "RoleRevoked"]
Data: { role: Symbol, account: Address, sender: Address }
```

### AdminChanged
```
Topics: ["rbac", "AdminChanged"]
Data: { old_admin: Address, new_admin: Address }
```

## Security Considerations

1. **Single Admin**: Only one address should hold the Admin role at a time
2. **Role Separation**: Consider separating critical roles (Upgrader, Pauser) across different addresses
3. **Event Monitoring**: Monitor events to detect unauthorized role changes
4. **Renouncement**: Accounts can renounce their own roles, which is useful for leaving a role
5. **Initialization**: The RBAC system can only be initialized once

## Testing

Run the tests:
```bash
cargo test -p access_control
```

## Integration Example

Here's how to integrate RBAC into an existing contract:

```rust
#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env};
use access_control::{Role, initialize, grant_role, require_role_auth, rbac_integration};

#[contract]
pub struct MyContract;

#[contractimpl]
impl MyContract {
    pub fn __constructor(env: Env, admin: Address) {
        // Initialize RBAC with admin
        initialize(&env, &admin);
        
        // Other initialization...
    }
    
    // Manager-only function
    pub fn manage_something(env: Env, caller: Address) {
        require_role_auth(&env, &Role::Manager, &caller);
        // Do management stuff
    }
    
    // Minter-only function  
    pub fn mint_something(env: Env, caller: Address) {
        require_role_auth(&env, &Role::Minter, &caller);
        // Do minting
    }
    
    // Admin can grant roles
    pub fn grant_manager_role(env: Env, caller: Address, new_manager: Address) {
        grant_role(&env, &Role::Manager, &new_manager, &caller);
    }
    
    // Upgrade functions using integration module
    pub fn schedule_upgrade(env: Env, caller: Address, wasm_hash: BytesN<32>) {
        rbac_integration::schedule_upgrade(&env, &caller, wasm_hash);
    }
}
```

## License

MIT License - See LICENSE file for details
