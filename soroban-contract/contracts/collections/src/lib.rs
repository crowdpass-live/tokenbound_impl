//! # CrowdPass Enumerable Collections
//!
//! Optimised, enumerable storage utilities for Soroban smart contracts.
//!
//! ## Provided types
//!
//! * [`EnumerableSet`] — an ordered, deduplicated set of values backed by two storage
//!   keys.  Insert / remove are O(1) (swap-with-last trick); iteration is O(n).
//!
//! * [`EnumerableMap`] — an ordered key-value map backed by three storage keys.
//!   Insert / remove / lookup are O(1); iteration is O(n).
//!
//! ## Storage tiers
//!
//! Both utilities accept a [`StorageTier`] parameter so callers can choose the
//! Soroban storage tier that best matches the data lifetime:
//!
//! | Tier         | Soroban method           | Typical use-case                  |
//! |--------------|--------------------------|-----------------------------------|
//! | `Instance`   | `env.storage().instance()` | Per-contract singleton state    |
//! | `Persistent` | `env.storage().persistent()` | Long-lived per-key records    |
//! | `Temporary`  | `env.storage().temporary()` | Short-lived / session state    |
//!
//! ## TTL management
//!
//! TTL extension is left to the **caller** (consistent with the `upgradeable`
//! crate).  After any mutation that touches a `Persistent` or `Temporary` key
//! you should call [`upgradeable::extend_persistent_ttl`] (or the equivalent
//! temporary helper) on the affected namespace keys.
//!
//! ## Example
//!
//! ```rust,ignore
//! use collections::{EnumerableSet, EnumerableMap, StorageTier};
//!
//! // --- EnumerableSet ---
//! let ns = symbol_short!("owners");
//! EnumerableSet::insert::<Address>(&env, StorageTier::Persistent, &ns, &alice);
//! EnumerableSet::insert::<Address>(&env, StorageTier::Persistent, &ns, &bob);
//! assert_eq!(EnumerableSet::length::<Address>(&env, StorageTier::Persistent, &ns), 2);
//!
//! // --- EnumerableMap ---
//! let ns = symbol_short!("balances");
//! EnumerableMap::insert::<Address, i128>(&env, StorageTier::Persistent, &ns, &alice, &100_i128);
//! let bal = EnumerableMap::get::<Address, i128>(&env, StorageTier::Persistent, &ns, &alice);
//! assert_eq!(bal, Some(100));
//! ```

#![no_std]

pub mod enumerable_map;
pub mod enumerable_set;
pub mod storage_type;

pub use enumerable_map::EnumerableMap;
pub use enumerable_set::EnumerableSet;
pub use storage_type::StorageTier;

#[cfg(test)]
mod test;
