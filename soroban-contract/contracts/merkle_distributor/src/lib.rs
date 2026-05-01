//! # Merkle Distributor Contract
//!
//! A proof-based token distribution contract for airdrops on Soroban.
//!
//! ## Overview
//!
//! The distributor is initialised with a **Merkle root** that commits to the
//! full airdrop allocation.  Every eligible recipient is identified by a leaf:
//!
//! ```text
//! leaf = SHA-256( sha256(claimant_address_str) ‖ amount_as_u64_le )
//! ```
//!
//! To claim, the recipient submits an ordered **proof** (a `Vec<BytesN<32>>`)
//! and an **index** (their position in the Merkle tree).  The contract
//! recomputes the root from the leaf + proof and rejects the call if it does
//! not match the stored root.
//!
//! ## Security properties
//!
//! * **Single-claim guard** — each index is tracked in persistent storage;
//!   a second claim for the same index is rejected.
//! * **Admin-gated sweep** — expired unclaimed tokens can only be recovered
//!   by the admin.
//! * **Pause / upgrade** — inherits the project-wide `upgradeable` time-lock.
//!
//! ## Proof verification
//!
//! Starting from the leaf hash, for each sibling in `proof`:
//! - sorted-pair hashing: `hash( min(current, sibling) ‖ max(current, sibling) )`
//!
//! This matches the most common off-chain Merkle tree libraries.

#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Bytes,
    BytesN, Env, Symbol, Vec,
};

use upgradeable as upg;

// ── Error catalogue ──────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// `initialize` called more than once.
    AlreadyInitialized = 1,
    /// Operation requires a prior `initialize`.
    NotInitialized = 2,
    /// The submitted Merkle proof does not reproduce the stored root.
    InvalidProof = 3,
    /// This index has already been claimed.
    AlreadyClaimed = 4,
    /// The airdrop window has expired; no new claims accepted.
    AirdropExpired = 5,
    /// The contract holds insufficient tokens to pay this claim.
    InsufficientBalance = 6,
    /// The airdrop has not yet expired; sweep is not allowed.
    NotExpired = 7,
    /// Nothing left to sweep.
    NothingToSweep = 8,
    /// Admin-only operation called by a non-admin.
    Unauthorized = 9,
}

// ── Storage keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// `bool` — whether `initialize` has been called.
    Initialized,
    /// `BytesN<32>` — the committed Merkle root.
    MerkleRoot,
    /// `Address` — the SEP-41 token distributed by this contract.
    Token,
    /// `u64` — optional UNIX timestamp after which no new claims are accepted.
    ///         0 means no expiry.
    Expiry,
    /// `bool` — claimed flag for leaf `index`.
    Claimed(u64),
}

// ── Event types ───────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ClaimedEvent {
    pub index: u64,
    pub claimant: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SweptEvent {
    pub recipient: Address,
    pub amount: i128,
}

// ── Merkle helpers ────────────────────────────────────────────────────────────

/// Build the 40-byte leaf preimage:
///   sha256(address_string_bytes)  [32 B]
/// ‖ amount as u64 little-endian   [ 8 B]
fn leaf_preimage(env: &Env, claimant: &Address, amount: i128) -> Bytes {
    // Hash the address string to get a stable 32-byte representation.
    let addr_str = claimant.to_string();
    // soroban_sdk::String -> soroban_sdk::Bytes via copy_into_slice workaround:
    // encode as raw bytes using Bytes::from_slice on the internal representation.
    let mut addr_raw = Bytes::new(env);
    let str_len = addr_str.len();
    // Build a fixed raw buffer — copy char by char.
    let mut buf = [0u8; 64]; // Stellar addresses are ~56 chars
    let copy_len = if str_len <= 64 { str_len } else { 64 };
    addr_str.copy_into_slice(&mut buf[..copy_len as usize]);
    addr_raw.append(&Bytes::from_slice(env, &buf[..copy_len as usize]));
    let addr_hash: BytesN<32> = env.crypto().sha256(&addr_raw).into();

    // Encode amount as u64 little-endian (8 bytes).
    let amount_u64 = amount as u64;
    let amt_buf: [u8; 8] = [
        (amount_u64 & 0xff) as u8,
        ((amount_u64 >> 8) & 0xff) as u8,
        ((amount_u64 >> 16) & 0xff) as u8,
        ((amount_u64 >> 24) & 0xff) as u8,
        ((amount_u64 >> 32) & 0xff) as u8,
        ((amount_u64 >> 40) & 0xff) as u8,
        ((amount_u64 >> 48) & 0xff) as u8,
        ((amount_u64 >> 56) & 0xff) as u8,
    ];

    let mut preimage = Bytes::new(env);
    preimage.append(&Bytes::from_slice(env, &addr_hash.to_array()));
    preimage.append(&Bytes::from_slice(env, &amt_buf));
    preimage
}

/// Compute the leaf hash: SHA-256(preimage).
fn compute_leaf(env: &Env, claimant: &Address, amount: i128) -> BytesN<32> {
    let preimage = leaf_preimage(env, claimant, amount);
    env.crypto().sha256(&preimage).into()
}

/// Sorted-pair hash used at every internal tree node.
/// Lexicographically smaller hash goes first, ensuring deterministic ordering.
fn hash_pair(env: &Env, a: &BytesN<32>, b: &BytesN<32>) -> BytesN<32> {
    let a_arr = a.to_array();
    let b_arr = b.to_array();

    // Determine lexicographic order
    let mut a_le_b = true;
    for i in 0..32usize {
        if a_arr[i] < b_arr[i] {
            a_le_b = true;
            break;
        } else if a_arr[i] > b_arr[i] {
            a_le_b = false;
            break;
        }
    }

    let mut combined = Bytes::new(env);
    if a_le_b {
        combined.append(&Bytes::from_slice(env, &a_arr));
        combined.append(&Bytes::from_slice(env, &b_arr));
    } else {
        combined.append(&Bytes::from_slice(env, &b_arr));
        combined.append(&Bytes::from_slice(env, &a_arr));
    }

    env.crypto().sha256(&combined).into()
}

/// Walk up the proof path and return the recomputed root.
fn compute_root(env: &Env, mut current: BytesN<32>, proof: &Vec<BytesN<32>>) -> BytesN<32> {
    let len = proof.len();
    for i in 0..len {
        let sibling = proof.get(i).unwrap();
        current = hash_pair(env, &current, &sibling);
    }
    current
}

// ── Storage helpers ───────────────────────────────────────────────────────────

fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Initialized)
        .unwrap_or(false)
}

fn load_root(env: &Env) -> BytesN<32> {
    env.storage()
        .instance()
        .get(&DataKey::MerkleRoot)
        .unwrap()
}

fn load_token(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Token).unwrap()
}

fn load_expiry(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::Expiry)
        .unwrap_or(0u64)
}

fn is_claimed_internal(env: &Env, index: u64) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Claimed(index))
        .unwrap_or(false)
}

fn set_claimed(env: &Env, index: u64) {
    env.storage()
        .persistent()
        .set(&DataKey::Claimed(index), &true);
    upg::extend_persistent_ttl(env, &DataKey::Claimed(index));
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct MerkleDistributor;

#[contractimpl]
impl MerkleDistributor {
    // ── Initialisation ────────────────────────────────────────────────────────

    /// Initialise the distributor.
    ///
    /// # Arguments
    /// * `admin`       — Controls funding, expiry, sweep, and upgrades.
    /// * `token`       — SEP-41 token to distribute.
    /// * `merkle_root` — 32-byte root of the airdrop Merkle tree.
    /// * `expiry`      — UNIX timestamp after which claims are blocked (0 = none).
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        merkle_root: BytesN<32>,
        expiry: u64,
    ) -> Result<(), Error> {
        if is_initialized(&env) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::Initialized, &true);
        env.storage()
            .instance()
            .set(&DataKey::MerkleRoot, &merkle_root);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Expiry, &expiry);

        upg::set_admin(&env, &admin);
        upg::init_version(&env);
        upg::extend_instance_ttl(&env);

        Ok(())
    }

    // ── Claim ─────────────────────────────────────────────────────────────────

    /// Claim an airdrop allocation.
    ///
    /// # Arguments
    /// * `index`    — Leaf index in the Merkle tree (unique per claimant).
    /// * `claimant` — Recipient address; must match the committed leaf.
    /// * `amount`   — Token amount (in smallest units) as committed in the leaf.
    /// * `proof`    — Ordered sibling hashes from leaf to root.
    pub fn claim(
        env: Env,
        index: u64,
        claimant: Address,
        amount: i128,
        proof: Vec<BytesN<32>>,
    ) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        upg::require_not_paused(&env);

        // Expiry check
        let expiry = load_expiry(&env);
        if expiry != 0 && env.ledger().timestamp() > expiry {
            return Err(Error::AirdropExpired);
        }

        // Double-claim guard
        if is_claimed_internal(&env, index) {
            return Err(Error::AlreadyClaimed);
        }

        // Auth: only the claimant (or an approved delegate) can claim
        claimant.require_auth();

        // Merkle proof verification
        let leaf = compute_leaf(&env, &claimant, amount);
        let computed_root = compute_root(&env, leaf, &proof);
        let stored_root = load_root(&env);

        if computed_root != stored_root {
            return Err(Error::InvalidProof);
        }

        // Balance check
        let token_addr = load_token(&env);
        let token_client = token::Client::new(&env, &token_addr);
        let contract_addr = env.current_contract_address();
        let balance = token_client.balance(&contract_addr);

        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        // Mark as claimed BEFORE transferring (checks-effects-interactions)
        set_claimed(&env, index);

        // Transfer tokens to claimant
        token_client.transfer(&contract_addr, &claimant, &amount);

        upg::extend_instance_ttl(&env);

        env.events().publish(
            (
                symbol_short!("merkle"),
                Symbol::new(&env, "Claimed"),
            ),
            ClaimedEvent {
                index,
                claimant,
                amount,
            },
        );

        Ok(())
    }

    // ── Admin operations ──────────────────────────────────────────────────────

    /// Fund the distributor: transfers `amount` tokens from `funder` to the
    /// contract.  Any address that has pre-approved the transfer can call this.
    pub fn fund(env: Env, funder: Address, amount: i128) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        funder.require_auth();

        let token_client = token::Client::new(&env, &load_token(&env));
        token_client.transfer(&funder, &env.current_contract_address(), &amount);

        upg::extend_instance_ttl(&env);

        Ok(())
    }

    /// Sweep all unclaimed tokens to `recipient` once the airdrop has expired.
    /// Only the admin may call this.
    pub fn sweep(env: Env, recipient: Address) -> Result<i128, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        upg::require_admin(&env);

        let expiry = load_expiry(&env);
        if expiry == 0 || env.ledger().timestamp() <= expiry {
            return Err(Error::NotExpired);
        }

        let token_addr = load_token(&env);
        let token_client = token::Client::new(&env, &token_addr);
        let contract_addr = env.current_contract_address();
        let balance = token_client.balance(&contract_addr);

        if balance <= 0 {
            return Err(Error::NothingToSweep);
        }

        token_client.transfer(&contract_addr, &recipient, &balance);

        upg::extend_instance_ttl(&env);

        env.events().publish(
            (
                symbol_short!("merkle"),
                Symbol::new(&env, "Swept"),
            ),
            SweptEvent {
                recipient,
                amount: balance,
            },
        );

        Ok(balance)
    }

    /// Update the expiry timestamp.  Only the admin may call this.
    pub fn set_expiry(env: Env, new_expiry: u64) -> Result<(), Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }

        upg::require_admin(&env);
        env.storage()
            .instance()
            .set(&DataKey::Expiry, &new_expiry);
        upg::extend_instance_ttl(&env);

        Ok(())
    }

    // ── Read-only queries ─────────────────────────────────────────────────────

    /// Return the stored Merkle root.
    pub fn merkle_root(env: Env) -> Result<BytesN<32>, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        Ok(load_root(&env))
    }

    /// Return the token address.
    pub fn token(env: Env) -> Result<Address, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        Ok(load_token(&env))
    }

    /// Return the expiry timestamp (0 = no expiry).
    pub fn expiry(env: Env) -> Result<u64, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        Ok(load_expiry(&env))
    }

    /// Check whether a given index has already been claimed.
    pub fn is_claimed(env: Env, index: u64) -> Result<bool, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        Ok(is_claimed_internal(&env, index))
    }

    /// Return the current token balance held by the contract.
    pub fn balance(env: Env) -> Result<i128, Error> {
        if !is_initialized(&env) {
            return Err(Error::NotInitialized);
        }
        let token_client = token::Client::new(&env, &load_token(&env));
        Ok(token_client.balance(&env.current_contract_address()))
    }

    /// Return the current contract version.
    pub fn version(env: Env) -> u32 {
        upg::get_version(&env)
    }

    // ── Upgrade / admin passthrough ───────────────────────────────────────────

    pub fn schedule_upgrade(env: Env, new_wasm_hash: BytesN<32>) {
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
