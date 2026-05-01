//! # Payment Splitter Contract
//!
//! Distributes incoming token payments across multiple recipients according to
//! configured share weights.  Designed for revenue-sharing use-cases such as
//! royalty splits, DAO treasury distributions, and multi-party ticketing fees.
//!
//! ## Features
//!
//! * **Configurable shares** — each recipient owns a `u32` weight; the contract
//!   computes their proportional cut at release time.
//! * **Multi-token support** — any SEP-41 / Soroban token can be split; callers
//!   pass the token contract address at release time.
//! * **Admin controls** — the admin can add / update / remove recipients and
//!   transfer admin rights.
//! * **Upgradeable** — inherits the project's `upgradeable` time-lock pattern.
//! * **Reentrancy-safe** — a lock flag prevents re-entrant `release` calls.
//! * **Dust-aware** — any wei-level remainder from integer division is sent to
//!   the *first* recipient so the contract never accumulates un-claimable dust.
//!
//! ## Invariants
//!
//! * Total shares ≥ 1 after initialization.
//! * No duplicate recipients.
//! * Maximum [`MAX_RECIPIENTS`] recipients (resource / gas guard).

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol,
    Vec,
};

use upgradeable as upg;

// ── Constants ────────────────────────────────────────────────────────────────

/// Hard cap on the number of recipients to bound per-call resource usage.
pub const MAX_RECIPIENTS: u32 = 50;

// ── Error catalogue ──────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    /// `initialize` was called more than once.
    AlreadyInitialized = 1,
    /// An operation requires initialization that hasn't happened yet.
    NotInitialized = 2,
    /// A recipient list with zero entries was provided.
    NoRecipients = 3,
    /// The number of recipients would exceed [`MAX_RECIPIENTS`].
    TooManyRecipients = 4,
    /// A share weight of zero was provided for a recipient.
    ZeroShare = 5,
    /// The recipient already exists in the list.
    DuplicateRecipient = 6,
    /// The recipient was not found in the list.
    RecipientNotFound = 7,
    /// The contract holds zero tokens of the requested asset; nothing to split.
    NothingToRelease = 8,
    /// A re-entrant call to `release` was detected and blocked.
    Reentrant = 9,
    /// The caller is not authorised to perform this action.
    Unauthorized = 10,
}

// ── Storage key enum ─────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// `bool` — whether `initialize` has been called.
    Initialized,
    /// `Vec<Recipient>` — ordered list of (address, shares) pairs.
    Recipients,
    /// `u32` — running total of all share weights.
    TotalShares,
    /// `bool` — reentrancy guard flag.
    Locked,
}

// ── Domain types ──────────────────────────────────────────────────────────────

/// A (recipient, share) pair stored in the contract.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Recipient {
    pub account: Address,
    pub shares: u32,
}

// ── Event types ───────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentReleasedEvent {
    pub token: Address,
    pub recipient: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RecipientAddedEvent {
    pub account: Address,
    pub shares: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RecipientRemovedEvent {
    pub account: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SharesUpdatedEvent {
    pub account: Address,
    pub old_shares: u32,
    pub new_shares: u32,
}

// ── Internal helpers ──────────────────────────────────────────────────────────

fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Initialized)
        .unwrap_or(false)
}

fn set_initialized(env: &Env) {
    env.storage()
        .instance()
        .set(&DataKey::Initialized, &true);
}

fn load_recipients(env: &Env) -> Vec<Recipient> {
    env.storage()
        .instance()
        .get(&DataKey::Recipients)
        .unwrap_or_else(|| Vec::new(env))
}

fn save_recipients(env: &Env, recipients: &Vec<Recipient>) {
    env.storage()
        .instance()
        .set(&DataKey::Recipients, recipients);
}

fn load_total_shares(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::TotalShares)
        .unwrap_or(0u32)
}

fn save_total_shares(env: &Env, total: u32) {
    env.storage().instance().set(&DataKey::TotalShares, &total);
}

fn is_locked(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Locked)
        .unwrap_or(false)
}

fn set_locked(env: &Env, locked: bool) {
    env.storage().instance().set(&DataKey::Locked, &locked);
}

/// Find the index of `account` in `recipients`, or `None`.
fn find_recipient(recipients: &Vec<Recipient>, account: &Address) -> Option<u32> {
    let len = recipients.len();
    for i in 0..len {
        let r = recipients.get(i).unwrap();
        if r.account == *account {
            return Some(i);
        }
    }
    None
}

/// Recalculate and persist total shares from the current recipient list.
fn recalculate_total(env: &Env, recipients: &Vec<Recipient>) {
    let mut total: u32 = 0;
    let len = recipients.len();
    for i in 0..len {
        let r = recipients.get(i).unwrap();
        total = total.saturating_add(r.shares);
    }
    save_total_shares(env, total);
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct PaymentSplitter;

#[contractimpl]
impl PaymentSplitter {
    // ── Initialisation ────────────────────────────────────────────────────────

    /// Initialise the splitter with an admin and an initial list of recipients.
    ///
    /// # Arguments
    ///
    /// * `admin`      — Address that controls recipient management and upgrades.
    /// * `recipients` — Initial list of `(account, shares)` pairs; must be
    ///                  non-empty, have no zero shares, and have no duplicates.
    pub fn initialize(
        env: Env,
        admin: Address,
        recipients: Vec<Recipient>,
    ) -> Result<(), Error> {
        if is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        if recipients.is_empty() {
            return Err(Error::NoRecipients);
        }
        if recipients.len() > MAX_RECIPIENTS {
            return Err(Error::TooManyRecipients);
        }

        // Validate each recipient: no zero shares, no duplicates.
        let mut validated: Vec<Recipient> = Vec::new(&env);
        let len = recipients.len();
        for i in 0..len {
            let r = recipients.get(i).unwrap();
            if r.shares == 0 {
                return Err(Error::ZeroShare);
            }
            if find_recipient(&validated, &r.account).is_some() {
                return Err(Error::DuplicateRecipient);
            }
            validated.push_back(r.clone());
        }

        save_recipients(&env, &validated);
        recalculate_total(&env, &validated);
        set_initialized(&env);

        upg::set_admin(&env, &admin);
        upg::init_version(&env);
        upg::extend_instance_ttl(&env);

        Ok(())
    }

    // ── Release ───────────────────────────────────────────────────────────────

    /// Split the contract's entire balance of `token` proportionally among all
    /// recipients according to their share weights.
    ///
    /// Any indivisible remainder (dust) is forwarded to the **first** recipient.
    ///
    /// # Security
    ///
    /// * Only the admin may trigger a release; this prevents griefing attacks
    ///   where an external actor forces a release at an inconvenient time.
    /// * A reentrancy lock ensures the function cannot be called recursively
    ///   even via cross-contract execution paths.
    pub fn release(env: Env, token: Address) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        // Reentrancy guard
        if is_locked(&env) {
            return Err(Error::Reentrant);
        }
        set_locked(&env, true);

        // Only the admin may trigger a release
        let admin = upg::get_admin(&env);
        admin.require_auth();

        let recipients = load_recipients(&env);
        if recipients.is_empty() {
            set_locked(&env, false);
            return Err(Error::NoRecipients);
        }

        let total_shares = load_total_shares(&env);
        if total_shares == 0 {
            set_locked(&env, false);
            return Err(Error::NoRecipients);
        }

        // Query the contract's own token balance
        let token_client = token::Client::new(&env, &token);
        let contract_address = env.current_contract_address();
        let balance = token_client.balance(&contract_address);

        if balance <= 0 {
            set_locked(&env, false);
            return Err(Error::NothingToRelease);
        }

        let total_shares_i128 = total_shares as i128;
        let len = recipients.len();
        let mut distributed: i128 = 0;

        // Pay every recipient except the first (who receives the remainder).
        for i in 1..len {
            let r = recipients.get(i).unwrap();
            let amount = balance * (r.shares as i128) / total_shares_i128;
            if amount > 0 {
                token_client.transfer(&contract_address, &r.account, &amount);
                distributed += amount;

                env.events().publish(
                    (
                        symbol_short!("splitter"),
                        Symbol::new(&env, "PaymentReleased"),
                    ),
                    PaymentReleasedEvent {
                        token: token.clone(),
                        recipient: r.account.clone(),
                        amount,
                    },
                );
            }
        }

        // First recipient gets the remainder (guards against dust accumulation)
        let first = recipients.get(0).unwrap();
        let remainder = balance - distributed;
        if remainder > 0 {
            token_client.transfer(&contract_address, &first.account, &remainder);

            env.events().publish(
                (
                    symbol_short!("splitter"),
                    Symbol::new(&env, "PaymentReleased"),
                ),
                PaymentReleasedEvent {
                    token: token.clone(),
                    recipient: first.account.clone(),
                    amount: remainder,
                },
            );
        }

        upg::extend_instance_ttl(&env);
        set_locked(&env, false);
        Ok(())
    }

    // ── Recipient management ──────────────────────────────────────────────────

    /// Add a new recipient with the given share weight.
    ///
    /// Only the admin may call this.
    pub fn add_recipient(
        env: Env,
        account: Address,
        shares: u32,
    ) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        let admin = upg::get_admin(&env);
        admin.require_auth();

        if shares == 0 {
            return Err(Error::ZeroShare);
        }

        let mut recipients = load_recipients(&env);

        if recipients.len() >= MAX_RECIPIENTS {
            return Err(Error::TooManyRecipients);
        }

        if find_recipient(&recipients, &account).is_some() {
            return Err(Error::DuplicateRecipient);
        }

        recipients.push_back(Recipient {
            account: account.clone(),
            shares,
        });

        save_recipients(&env, &recipients);
        recalculate_total(&env, &recipients);
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (
                symbol_short!("splitter"),
                Symbol::new(&env, "RecipientAdded"),
            ),
            RecipientAddedEvent { account, shares },
        );

        Ok(())
    }

    /// Remove an existing recipient.  Their share weight is subtracted from the
    /// total.  Only the admin may call this.
    pub fn remove_recipient(env: Env, account: Address) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        let admin = upg::get_admin(&env);
        admin.require_auth();

        let mut recipients = load_recipients(&env);

        let idx = find_recipient(&recipients, &account)
            .ok_or(Error::RecipientNotFound)?;

        // Swap-with-last O(1) removal
        let last_idx = recipients.len() - 1;
        if idx != last_idx {
            let last = recipients.get(last_idx).unwrap();
            recipients.set(idx, last);
        }
        recipients.pop_back();

        save_recipients(&env, &recipients);
        recalculate_total(&env, &recipients);
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (
                symbol_short!("splitter"),
                Symbol::new(&env, "RecipientRemoved"),
            ),
            RecipientRemovedEvent { account },
        );

        Ok(())
    }

    /// Update the share weight of an existing recipient.
    ///
    /// Only the admin may call this.
    pub fn update_shares(
        env: Env,
        account: Address,
        new_shares: u32,
    ) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        let admin = upg::get_admin(&env);
        admin.require_auth();

        if new_shares == 0 {
            return Err(Error::ZeroShare);
        }

        let mut recipients = load_recipients(&env);

        let idx = find_recipient(&recipients, &account)
            .ok_or(Error::RecipientNotFound)?;

        let mut r = recipients.get(idx).unwrap();
        let old_shares = r.shares;
        r.shares = new_shares;
        recipients.set(idx, r);

        save_recipients(&env, &recipients);
        recalculate_total(&env, &recipients);
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (
                symbol_short!("splitter"),
                Symbol::new(&env, "SharesUpdated"),
            ),
            SharesUpdatedEvent {
                account,
                old_shares,
                new_shares,
            },
        );

        Ok(())
    }

    // ── Read-only queries ─────────────────────────────────────────────────────

    /// Return the full list of `(account, shares)` recipients.
    pub fn recipients(env: Env) -> Result<Vec<Recipient>, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        Ok(load_recipients(&env))
    }

    /// Return the share weight for a specific account.
    pub fn shares(env: Env, account: Address) -> Result<u32, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        let recipients = load_recipients(&env);
        let idx = find_recipient(&recipients, &account)
            .ok_or(Error::RecipientNotFound)?;
        Ok(recipients.get(idx).unwrap().shares)
    }

    /// Return the sum of all share weights.
    pub fn total_shares(env: Env) -> Result<u32, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        Ok(load_total_shares(&env))
    }

    /// Return the number of registered recipients.
    pub fn recipient_count(env: Env) -> Result<u32, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        Ok(load_recipients(&env).len())
    }

    /// Return the current contract version.
    pub fn version(env: Env) -> u32 {
        upg::get_version(&env)
    }

    // ── Upgrade / admin passthrough ───────────────────────────────────────────

    pub fn schedule_upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        upg::schedule_upgrade(&env, new_wasm_hash);
    }

    pub fn cancel_upgrade(env: Env) {
        upg::cancel_upgrade(&env);
    }

    pub fn commit_upgrade(env: Env) {
        upg::commit_upgrade(&env);
    }

    pub fn pause(env: Env) {
        upg::pause(&env);
    }

    pub fn unpause(env: Env) {
        upg::unpause(&env);
    }

    pub fn transfer_admin(env: Env, new_admin: Address) {
        upg::transfer_admin(&env, new_admin);
    }
}

#[cfg(test)]
mod test;
