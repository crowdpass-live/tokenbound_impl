#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, Symbol,
};

use upgradeable as upg;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    ScheduleNotFound = 2,
    CliffNotReached = 3,
    NothingToRelease = 4,
    InvalidSchedule = 5,
    AlreadyRevoked = 6,
    NotRevocable = 7,
}

#[contracttype]
pub enum DataKey {
    Schedule(u32),
    Counter,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VestingSchedule {
    pub id: u32,
    pub beneficiary: Address,
    pub token: Address,
    pub total_amount: i128,
    pub released: i128,
    pub start: u64,
    pub cliff: u64,
    pub end: u64,
    pub revocable: bool,
    pub revoked: bool,
}

impl VestingSchedule {
    fn vested_at(&self, now: u64) -> i128 {
        if self.revoked || now < self.cliff {
            return 0;
        }
        if now >= self.end {
            return self.total_amount;
        }
        let elapsed = (now - self.start) as i128;
        let duration = (self.end - self.start) as i128;
        self.total_amount * elapsed / duration
    }

    fn releasable(&self, now: u64) -> i128 {
        self.vested_at(now) - self.released
    }
}

#[contract]
pub struct Vesting;

#[contractimpl]
impl Vesting {
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

    /// Create a new vesting schedule. The caller must have approved `total_amount`
    /// tokens to this contract before calling.
    pub fn create_schedule(
        env: Env,
        funder: Address,
        beneficiary: Address,
        token: Address,
        total_amount: i128,
        start: u64,
        cliff_duration: u64,
        total_duration: u64,
        revocable: bool,
    ) -> Result<u32, Error> {
        upg::require_not_paused(&env);
        funder.require_auth();

        if total_amount <= 0
            || total_duration == 0
            || cliff_duration > total_duration
            || start < env.ledger().timestamp()
        {
            return Err(Error::InvalidSchedule);
        }

        let cliff = start + cliff_duration;
        let end = start + total_duration;

        token::Client::new(&env, &token).transfer(
            &funder,
            &env.current_contract_address(),
            &total_amount,
        );

        let id = Self::next_id(&env);
        let schedule = VestingSchedule {
            id,
            beneficiary: beneficiary.clone(),
            token,
            total_amount,
            released: 0,
            start,
            cliff,
            end,
            revocable,
            revoked: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Schedule(id), &schedule);
        Self::extend_persistent_ttl(&env, &DataKey::Schedule(id));
        upg::extend_instance_ttl(&env);

        env.events().publish(
            (Symbol::new(&env, "schedule_created"),),
            (id, beneficiary, total_amount, cliff, end),
        );

        Ok(id)
    }

    /// Release all currently vested tokens to the beneficiary.
    pub fn release(env: Env, schedule_id: u32) -> Result<i128, Error> {
        upg::require_not_paused(&env);

        let mut schedule: VestingSchedule = env
            .storage()
            .persistent()
            .get(&DataKey::Schedule(schedule_id))
            .ok_or(Error::ScheduleNotFound)?;

        let now = env.ledger().timestamp();

        if now < schedule.cliff {
            return Err(Error::CliffNotReached);
        }

        let amount = schedule.releasable(now);
        if amount <= 0 {
            return Err(Error::NothingToRelease);
        }

        schedule.released += amount;
        env.storage()
            .persistent()
            .set(&DataKey::Schedule(schedule_id), &schedule);
        Self::extend_persistent_ttl(&env, &DataKey::Schedule(schedule_id));

        token::Client::new(&env, &schedule.token).transfer(
            &env.current_contract_address(),
            &schedule.beneficiary,
            &amount,
        );

        env.events().publish(
            (Symbol::new(&env, "tokens_released"),),
            (schedule_id, schedule.beneficiary, amount),
        );

        Ok(amount)
    }

    /// Revoke a revocable schedule. Unreleased vested tokens go to the beneficiary,
    /// the rest returns to the admin.
    pub fn revoke(env: Env, schedule_id: u32) -> Result<(), Error> {
        upg::require_not_paused(&env);
        upg::require_admin(&env);

        let mut schedule: VestingSchedule = env
            .storage()
            .persistent()
            .get(&DataKey::Schedule(schedule_id))
            .ok_or(Error::ScheduleNotFound)?;

        if !schedule.revocable {
            return Err(Error::NotRevocable);
        }
        if schedule.revoked {
            return Err(Error::AlreadyRevoked);
        }

        let now = env.ledger().timestamp();
        let vested = schedule.vested_at(now);
        let to_beneficiary = vested - schedule.released;
        let to_admin = schedule.total_amount - vested;

        schedule.revoked = true;
        schedule.released = vested;

        env.storage()
            .persistent()
            .set(&DataKey::Schedule(schedule_id), &schedule);
        Self::extend_persistent_ttl(&env, &DataKey::Schedule(schedule_id));

        let token_client = token::Client::new(&env, &schedule.token);

        if to_beneficiary > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &schedule.beneficiary,
                &to_beneficiary,
            );
        }

        if to_admin > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &upg::get_admin(&env),
                &to_admin,
            );
        }

        env.events().publish(
            (Symbol::new(&env, "schedule_revoked"),),
            (schedule_id, to_beneficiary, to_admin),
        );

        Ok(())
    }

    pub fn get_schedule(env: Env, schedule_id: u32) -> Option<VestingSchedule> {
        env.storage()
            .persistent()
            .get(&DataKey::Schedule(schedule_id))
    }

    pub fn releasable(env: Env, schedule_id: u32) -> Result<i128, Error> {
        let schedule: VestingSchedule = env
            .storage()
            .persistent()
            .get(&DataKey::Schedule(schedule_id))
            .ok_or(Error::ScheduleNotFound)?;
        Ok(schedule.releasable(env.ledger().timestamp()))
    }

    pub fn schedule_upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        upg::schedule_upgrade(&env, new_wasm_hash);
    }

    pub fn cancel_upgrade(env: Env) {
        upg::cancel_upgrade(&env);
    }

    pub fn commit_upgrade(env: Env) {
        upg::commit_upgrade(&env);
    }

    /// Immediate (fast-path) upgrade. Admin-only, no timelock — see
    /// `upgradeable::upgrade` for the full security note. Reserve for
    /// emergencies; prefer `schedule_upgrade` + `commit_upgrade` for
    /// routine upgrades.
    pub fn upgrade(env: Env, new_wasm_hash: soroban_sdk::BytesN<32>) {
        upg::upgrade(&env, new_wasm_hash);
    }

    /// Apply post-upgrade state-shape migrations and bump the version to
    /// `target_version`. Admin-only; rejects downgrades.
    pub fn migrate(env: Env, target_version: u32) {
        upg::require_admin(&env);
        upg::require_version_increase(&env, target_version);

        match target_version {
            _ => {}
        }

        upg::migration_completed(&env, target_version);
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

    fn next_id(env: &Env) -> u32 {
        let id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::Counter)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::Counter, &(id + 1));
        id
    }

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        upg::extend_persistent_ttl(env, key);
    }
}

#[cfg(test)]
mod test;
