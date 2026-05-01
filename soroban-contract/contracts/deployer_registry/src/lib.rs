//! Deployer Registry — RBAC for CrowdPass contract deployment.
//!
//! # Overview
//!
//! `DeployerRegistry` is a standalone contract that gates **who** is allowed
//! to deploy new CrowdPass child contracts (e.g. per-event ticket NFT
//! contracts deployed via [`ticket_factory`]). It maintains an
//! admin-managed allowlist of deployer addresses and a two-step admin
//! transfer flow that prevents accidental lockout.
//!
//! Production contracts that deploy child contracts (currently
//! `ticket_factory`) accept an optional registry address at construction or
//! via a setter. When configured, those contracts call `is_authorized(...)`
//! before invoking `env.deployer()` and reject the call if the address is
//! not on the allowlist.
//!
//! # Roles
//!
//! - **`Admin`** — full control: can add/remove deployers, propose admin
//!   transfers. Exactly one address holds this role at any time.
//! - **`Deployer`** — explicitly allowlisted. Can call gated deployment
//!   entry points on the production contracts that consult this registry.
//! - **`Operator`** — every other authenticated address. Has read-only
//!   visibility into the registry state but cannot mutate it.
//!
//! The [`Role`] enum is exposed via the [`DeployerRegistry::role_of`] view
//! so off-chain tooling (dashboards, deploy scripts) can render the
//! permission model uniformly.
//!
//! # Authorization model
//!
//! Every state-mutating function follows the same pattern:
//!
//! 1. The address parameter calls `require_auth()` to prove signature.
//! 2. The function reads the stored admin (or pending-admin) from instance
//!    storage and **defensively** compares it to the auth-bearing address.
//!    The `require_auth` call alone is enough on a correctly-configured
//!    network, but the explicit comparison protects against future SDK
//!    changes and makes the intent obvious to auditors.
//!
//! # Two-step admin transfer
//!
//! Direct admin transfer is dangerous: a typo in `new_admin` permanently
//! locks the registry. The flow is therefore split:
//!
//! 1. `propose_admin(current_admin, new_admin)` records `new_admin` as the
//!    pending admin. Current admin remains in charge.
//! 2. `accept_admin(new_admin)` requires the proposed address to sign,
//!    proving they control the key. Only on acceptance does the admin
//!    pointer move.
//!
//! At any point `propose_admin` may be re-called to overwrite the pending
//! address (e.g. if the original proposal was a typo). There is no
//! `cancel_admin` because re-proposing serves the same purpose.
//!
//! # Audit events
//!
//! Every mutation emits an indexable Soroban event so off-chain monitoring
//! can build a full audit trail:
//!
//! | Topic                        | Data                       |
//! |------------------------------|----------------------------|
//! | `("registry", "init")`       | `admin: Address`           |
//! | `("deployer", "added")`      | `deployer: Address`        |
//! | `("deployer", "removed")`    | `deployer: Address`        |
//! | `("admin", "proposed")`      | `new_admin: Address`       |
//! | `("admin", "xferred")`       | `new_admin: Address`       |

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env,
};

use upgradeable as upg;

/// Errors returned by the Deployer Registry.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// `__constructor` has not run yet — the registry has no admin.
    NotInitialized = 1,
    /// The address attempting a privileged action is not the stored admin.
    Unauthorized = 2,
    /// `accept_admin` was called but no proposal is pending, or the caller
    /// is not the proposed address.
    NoPendingAdmin = 3,
    /// `add_deployer` was called for an address that is already on the
    /// allowlist (idempotent, but signaled for clarity).
    DeployerAlreadyExists = 4,
    /// `remove_deployer` was called for an address that is not on the
    /// allowlist.
    DeployerNotFound = 5,
    /// `__constructor` or `initialize` was called but the registry is already initialized.
    AlreadyInitialized = 6,
}

/// Storage keys for the Deployer Registry.
///
/// `Admin` and `PendingAdmin` are singleton config and live in instance
/// storage (cheap reads, shared TTL). `Deployer(Address)` is a per-address
/// allowlist flag and lives in persistent storage so the allowlist survives
/// instance-storage TTL bumps without paying re-write costs.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// Current administrator of the registry.
    Admin,
    /// Address that has been proposed as the next admin but has not yet
    /// accepted the role.
    PendingAdmin,
    /// Allowlist membership flag for a specific address.
    Deployer(Address),
}

/// Role classification for an address relative to the registry.
///
/// This is a view-side classifier, not a stored field — every call computes
/// the role on demand from the underlying admin pointer and allowlist
/// state. It exists primarily so off-chain tooling can render the
/// permission model in a single call.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Role {
    /// The configured registry admin.
    Admin,
    /// On the deployer allowlist.
    Deployer,
    /// Authenticated but holds neither of the privileged roles. Used as a
    /// catch-all for any address that interacts with the registry as a
    /// reader.
    Operator,
}

/// Deployer Registry contract.
#[contract]
pub struct DeployerRegistry;

#[contractimpl]
impl DeployerRegistry {
    /// Initialise the registry with the given administrator address.
    ///
    /// # Authorisation
    /// `admin.require_auth()` — the address being installed as admin must
    /// sign the transaction so a malicious deployer cannot install a
    /// foreign address as admin during construction.
    ///
    /// # Panics
    /// Panics if the contract has already been initialised (i.e. the
    /// `Admin` slot is already populated). The constructor is expected to
    /// be called exactly once per deployment.
    pub fn __constructor(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        upg::extend_instance_ttl(&env);

        env.events()
            .publish((symbol_short!("registry"), symbol_short!("init")), admin);
        Ok(())
    }

    // ── Allowlist management ─────────────────────────────────────────────────

    /// Add `deployer` to the allowlist.
    ///
    /// # Authorisation
    /// Admin-only. Both `admin.require_auth()` and an explicit equality
    /// check against the stored admin must pass.
    ///
    /// # Errors
    /// - [`Error::NotInitialized`] if the registry has no admin.
    /// - [`Error::Unauthorized`] if `admin` is not the stored admin.
    /// - [`Error::DeployerAlreadyExists`] if `deployer` is already on the
    ///   allowlist (idempotent — no event is re-emitted).
    pub fn add_deployer(
        env: Env,
        admin: Address,
        deployer: Address,
    ) -> Result<(), Error> {
        Self::require_stored_admin(&env, &admin)?;

        let key = DataKey::Deployer(deployer.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::DeployerAlreadyExists);
        }

        env.storage().persistent().set(&key, &true);
        upg::extend_persistent_ttl(&env, &key);
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("deployer"), symbol_short!("added")),
            deployer,
        );
        Ok(())
    }

    /// Remove `deployer` from the allowlist.
    ///
    /// # Authorisation
    /// Admin-only.
    ///
    /// # Errors
    /// - [`Error::NotInitialized`] if the registry has no admin.
    /// - [`Error::Unauthorized`] if `admin` is not the stored admin.
    /// - [`Error::DeployerNotFound`] if `deployer` is not on the allowlist.
    pub fn remove_deployer(
        env: Env,
        admin: Address,
        deployer: Address,
    ) -> Result<(), Error> {
        Self::require_stored_admin(&env, &admin)?;

        let key = DataKey::Deployer(deployer.clone());
        if !env.storage().persistent().has(&key) {
            return Err(Error::DeployerNotFound);
        }

        env.storage().persistent().remove(&key);
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("deployer"), symbol_short!("removed")),
            deployer,
        );
        Ok(())
    }

    /// Check whether `deployer` is on the allowlist.
    ///
    /// View function — no authorisation, no state changes. Returns `true`
    /// for either:
    /// - addresses on the allowlist, **or**
    /// - the configured admin (admins are implicitly authorized to deploy).
    pub fn is_authorized(env: Env, deployer: Address) -> bool {
        if env.storage().persistent().has(&DataKey::Deployer(deployer.clone())) {
            return true;
        }
        if let Some(admin) = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Admin)
        {
            return admin == deployer;
        }
        false
    }

    /// Classify `addr` against the registry's role taxonomy.
    ///
    /// Returns [`Role::Admin`] if `addr` is the configured admin,
    /// [`Role::Deployer`] if `addr` is on the allowlist, and
    /// [`Role::Operator`] otherwise.
    pub fn role_of(env: Env, addr: Address) -> Role {
        if let Some(admin) = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Admin)
        {
            if admin == addr {
                return Role::Admin;
            }
        }
        if env.storage().persistent().has(&DataKey::Deployer(addr)) {
            Role::Deployer
        } else {
            Role::Operator
        }
    }

    /// Read the configured admin.
    ///
    /// # Errors
    /// [`Error::NotInitialized`] if the registry has no admin.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    /// Read the proposed admin, if a transfer is in flight.
    pub fn get_pending_admin(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::PendingAdmin)
    }

    // ── Two-step admin transfer ──────────────────────────────────────────────

    /// Propose `new_admin` as the next administrator.
    ///
    /// The transfer is **not** complete until `new_admin` calls
    /// [`Self::accept_admin`] from a key they control. This prevents the
    /// classic "transfer to a typo'd / wrong-network address and lock the
    /// contract forever" failure mode.
    ///
    /// # Authorisation
    /// Current admin only.
    pub fn propose_admin(
        env: Env,
        current_admin: Address,
        new_admin: Address,
    ) -> Result<(), Error> {
        Self::require_stored_admin(&env, &current_admin)?;

        env.storage()
            .instance()
            .set(&DataKey::PendingAdmin, &new_admin);
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("admin"), symbol_short!("proposed")),
            new_admin,
        );
        Ok(())
    }

    /// Accept the pending admin role.
    ///
    /// # Authorisation
    /// `new_admin.require_auth()` — only the proposed address can complete
    /// the transfer. The function then verifies that the auth-bearing
    /// address matches the stored `PendingAdmin`.
    ///
    /// # Errors
    /// - [`Error::NoPendingAdmin`] if there is no pending proposal **or**
    ///   the caller is not the proposed address.
    pub fn accept_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        new_admin.require_auth();

        let pending: Address = env
            .storage()
            .instance()
            .get(&DataKey::PendingAdmin)
            .ok_or(Error::NoPendingAdmin)?;
        if pending != new_admin {
            return Err(Error::NoPendingAdmin);
        }

        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.storage().instance().remove(&DataKey::PendingAdmin);
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (symbol_short!("admin"), symbol_short!("xferred")),
            new_admin,
        );
        Ok(())
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    /// Defense-in-depth admin check used by every privileged entry point.
    /// Calls `admin.require_auth()` first (so a missing signature panics
    /// before we touch storage), then verifies that the auth-bearing
    /// address matches the stored admin (so a stale admin parameter is
    /// rejected with a typed error rather than silently succeeding).
    fn require_stored_admin(env: &Env, admin: &Address) -> Result<(), Error> {
        admin.require_auth();
        let stored: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored != *admin {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }
}

#[cfg(test)]
mod test;
