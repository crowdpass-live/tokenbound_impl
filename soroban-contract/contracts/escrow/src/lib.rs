//! Escrow contract with milestone approvals and dispute resolution hooks.
//!
//! # Roles
//! - **depositor** – funds the escrow and approves milestones.
//! - **recipient** – receives funds as milestones are approved.
//! - **arbiter**   – resolves disputes; set at creation time.
//!
//! # Lifecycle
//! ```text
//! create_escrow → [fund] → approve_milestone (repeats) → close
//!                       ↘ open_dispute → resolve_dispute
//! ```

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, Symbol, Vec,
};

use upgradeable as upg;

// ── Errors ────────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    EscrowNotFound = 2,
    Unauthorized = 3,
    InvalidMilestone = 4,
    MilestoneAlreadyApproved = 5,
    EscrowClosed = 6,
    DisputeAlreadyOpen = 7,
    NoOpenDispute = 8,
    InsufficientFunds = 9,
    InvalidAmounts = 10,
}

// ── Types ─────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EscrowStatus {
    Active = 0,
    Disputed = 1,
    Closed = 2,
}

/// A single milestone: description hash (off-chain) + amount to release on approval.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub amount: i128,
    pub approved: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Escrow {
    pub id: u32,
    pub depositor: Address,
    pub recipient: Address,
    pub arbiter: Address,
    pub token: Address,
    pub total_amount: i128,
    pub released: i128,
    pub status: EscrowStatus,
    pub milestones: Vec<Milestone>,
}

#[contracttype]
pub enum DataKey {
    Counter,
    Escrow(u32),
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    // ── Admin ─────────────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Counter) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        upg::set_admin(&env, &admin);
        upg::init_version(&env);
        env.storage().instance().set(&DataKey::Counter, &0u32);
        upg::extend_instance_ttl(&env);
        Ok(())
    }

    // ── Create ────────────────────────────────────────────────────────────────

    /// Create an escrow and immediately transfer `total_amount` tokens from
    /// `depositor` into the contract.  `milestone_amounts` must sum to
    /// `total_amount`.
    pub fn create_escrow(
        env: Env,
        depositor: Address,
        recipient: Address,
        arbiter: Address,
        token: Address,
        milestone_amounts: Vec<i128>,
    ) -> Result<u32, Error> {
        upg::require_not_paused(&env);
        depositor.require_auth();

        if milestone_amounts.is_empty() {
            return Err(Error::InvalidMilestone);
        }

        let mut total_amount: i128 = 0;
        for amount in milestone_amounts.iter() {
            total_amount += amount;
        }
        if total_amount <= 0 {
            return Err(Error::InvalidAmounts);
        }

        // Pull funds from depositor.
        token::Client::new(&env, &token).transfer(
            &depositor,
            &env.current_contract_address(),
            &total_amount,
        );

        let mut milestones: Vec<Milestone> = Vec::new(&env);
        for amount in milestone_amounts.iter() {
            milestones.push_back(Milestone { amount, approved: false });
        }

        let id = Self::next_id(&env);
        let escrow = Escrow {
            id,
            depositor: depositor.clone(),
            recipient: recipient.clone(),
            arbiter: arbiter.clone(),
            token,
            total_amount,
            released: 0,
            status: EscrowStatus::Active,
            milestones,
        };

        env.storage().persistent().set(&DataKey::Escrow(id), &escrow);
        Self::extend_ttl(&env, id);
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "EscrowCreated"),),
            (id, depositor, recipient, arbiter, total_amount),
        );

        Ok(id)
    }

    // ── Milestone approval ────────────────────────────────────────────────────

    /// Depositor approves a milestone; funds are released to the recipient.
    pub fn approve_milestone(
        env: Env,
        escrow_id: u32,
        milestone_index: u32,
    ) -> Result<i128, Error> {
        upg::require_not_paused(&env);

        let mut escrow = Self::load(&env, escrow_id)?;
        Self::require_active(&escrow)?;
        escrow.depositor.require_auth();

        let idx = milestone_index as usize;
        if idx >= escrow.milestones.len() as usize {
            return Err(Error::InvalidMilestone);
        }

        let milestone = escrow.milestones.get(milestone_index).unwrap();
        if milestone.approved {
            return Err(Error::MilestoneAlreadyApproved);
        }

        // Rebuild milestones vec with this entry marked approved.
        let mut updated: Vec<Milestone> = Vec::new(&env);
        for i in 0..escrow.milestones.len() {
            let m = escrow.milestones.get(i).unwrap();
            if i == milestone_index {
                updated.push_back(Milestone { amount: m.amount, approved: true });
            } else {
                updated.push_back(m);
            }
        }
        escrow.milestones = updated;
        escrow.released += milestone.amount;

        token::Client::new(&env, &escrow.token).transfer(
            &env.current_contract_address(),
            &escrow.recipient,
            &milestone.amount,
        );

        // Auto-close when all milestones are approved.
        if escrow.released >= escrow.total_amount {
            escrow.status = EscrowStatus::Closed;
            env.events().publish(
                (Symbol::new(&env, "EscrowClosed"),),
                (escrow_id,),
            );
        }

        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        Self::extend_ttl(&env, escrow_id);

        env.events().publish(
            (Symbol::new(&env, "MilestoneApproved"),),
            (escrow_id, milestone_index, milestone.amount),
        );

        Ok(milestone.amount)
    }

    // ── Dispute hooks ─────────────────────────────────────────────────────────

    /// Either party opens a dispute; only the arbiter can then resolve it.
    pub fn open_dispute(env: Env, escrow_id: u32, caller: Address) -> Result<(), Error> {
        upg::require_not_paused(&env);

        let mut escrow = Self::load(&env, escrow_id)?;
        Self::require_active(&escrow)?;
        caller.require_auth();

        // Only depositor or recipient may open a dispute.
        if caller != escrow.depositor && caller != escrow.recipient {
            return Err(Error::Unauthorized);
        }

        escrow.status = EscrowStatus::Disputed;
        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        Self::extend_ttl(&env, escrow_id);

        env.events().publish(
            (Symbol::new(&env, "DisputeOpened"),),
            (escrow_id, caller),
        );

        Ok(())
    }

    /// Arbiter resolves a dispute by splitting the *remaining* (unreleased)
    /// balance between depositor and recipient.
    /// `recipient_share` is the fraction going to the recipient (0..=remaining).
    pub fn resolve_dispute(
        env: Env,
        escrow_id: u32,
        recipient_share: i128,
    ) -> Result<(), Error> {
        upg::require_not_paused(&env);

        let mut escrow = Self::load(&env, escrow_id)?;
        if !matches!(escrow.status, EscrowStatus::Disputed) {
            return Err(Error::NoOpenDispute);
        }
        escrow.arbiter.require_auth();

        let remaining = escrow.total_amount - escrow.released;
        if recipient_share < 0 || recipient_share > remaining {
            return Err(Error::InvalidAmounts);
        }
        let depositor_share = remaining - recipient_share;

        let token_client = token::Client::new(&env, &escrow.token);

        if recipient_share > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.recipient,
                &recipient_share,
            );
        }
        if depositor_share > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &escrow.depositor,
                &depositor_share,
            );
        }

        escrow.released = escrow.total_amount;
        escrow.status = EscrowStatus::Closed;

        env.storage().persistent().set(&DataKey::Escrow(escrow_id), &escrow);
        Self::extend_ttl(&env, escrow_id);

        env.events().publish(
            (Symbol::new(&env, "DisputeResolved"),),
            (escrow_id, recipient_share, depositor_share),
        );

        Ok(())
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    pub fn get_escrow(env: Env, escrow_id: u32) -> Option<Escrow> {
        env.storage().persistent().get(&DataKey::Escrow(escrow_id))
    }

    // ── Upgrade helpers (delegated to upgradeable crate) ──────────────────────

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

    // ── Helpers ───────────────────────────────────────────────────────────────

    fn load(env: &Env, id: u32) -> Result<Escrow, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Escrow(id))
            .ok_or(Error::EscrowNotFound)
    }

    fn require_active(escrow: &Escrow) -> Result<(), Error> {
        match escrow.status {
            EscrowStatus::Active => Ok(()),
            EscrowStatus::Disputed => Err(Error::DisputeAlreadyOpen),
            EscrowStatus::Closed => Err(Error::EscrowClosed),
        }
    }

    fn next_id(env: &Env) -> u32 {
        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::Counter, &(id + 1));
        id
    }

    fn extend_ttl(env: &Env, id: u32) {
        upg::extend_persistent_ttl(env, &DataKey::Escrow(id));
    }
}

#[cfg(test)]
mod test;
