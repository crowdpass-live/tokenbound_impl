# Multi-Admin Role Management

The `multi_admin` contract provides a reusable role-management primitive designed for least-privilege deployments.

## Features

- Multiple admin addresses
- Grant and revoke admin privileges
- Prevents removal of the final administrator
- Supports self-renouncing admins

## Why this helps

Single-key administration creates a high-risk central point of failure. Multi-admin controls allow governance and operations to be split across multiple participants while preserving strong access checks.

## Usage

```rust
use multi_admin::MultiAdmin;

pub fn add_admin(env: Env, caller: Address, new_admin: Address) {
    MultiAdminClient::new(&env, &contract_id)
        .grant_admin(&caller, &new_admin)
        .unwrap();
}
```

## API

- `initialize(admin)` — initialize with a single initial admin
- `grant_admin(caller, new_admin)` — current admin grants another admin
- `revoke_admin(caller, admin_to_remove)` — current admin revokes admin rights
- `renounce_admin(caller)` — current admin resigns their own rights
- `is_admin(address)` — query membership
- `get_admins()` — list current admins
