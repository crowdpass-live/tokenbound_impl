//! Enumerable set utility for Soroban storage.
//!
//! # Storage layout
//!
//! For each (namespace, StorageTier) pair the set occupies **two** storage
//! slots:
//!
//! | Key variant              | Type     | Description                        |
//! |--------------------------|----------|------------------------------------|
//! | `SetValues(namespace)`   | `Vec<V>` | Ordered list of members            |
//! | `SetIndex(namespace, u64)`| `u32`   | 1-based position; key is Val payload|
//!
//! The member's `Val` raw payload (a `u64`) is used as the discriminant in the
//! index key so that `Val` itself never appears inside a `#[contracttype]`
//! variant (which would violate XDR constraints).
//!
//! # Removal algorithm — swap-with-last
//!
//! When removing element `v` at 0-based position `i`:
//! 1. Read the last element `last` from the Vec.
//! 2. Overwrite `vec[i]` with `last`.
//! 3. Update `SetIndex(ns, last_payload)` to `i + 1` (1-based).
//! 4. Pop the last slot from the Vec.
//! 5. Delete `SetIndex(ns, v_payload)`.

use soroban_sdk::{contracttype, IntoVal, Symbol, TryFromVal, Val, Vec};

use crate::storage_type::StorageTier;
use soroban_sdk::Env;

// ── Storage key types ────────────────────────────────────────────────────────

/// Storage key for the ordered values Vec of a named set.
#[contracttype]
#[derive(Clone, Debug)]
pub enum SetKey {
    /// The ordered `Vec<V>` of set members.
    Values(Symbol),
    /// Cached number of elements in the set.
    Count(Symbol),
    /// 1-based index of a member.  The second field is the member's raw `Val`
    /// payload encoded as a `u64`, avoiding XDR limitations on `Val` fields.
    Index(Symbol, u64),
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Extract the raw bit-pattern of a `Val` for use as a storage key discriminant.
#[inline]
fn val_payload<V: IntoVal<Env, Val>>(env: &Env, v: &V) -> u64 {
    v.into_val(env).get_payload()
}

// ── Public API ───────────────────────────────────────────────────────────────

/// Stateless, namespace-scoped enumerable set stored in Soroban.
///
/// All functions are free (not methods); the caller supplies the [`Env`],
/// the [`StorageTier`], and a *namespace* [`Symbol`] that scopes all keys
/// so multiple independent sets can live in the same contract.
pub struct EnumerableSet;

impl EnumerableSet {
    // ── Mutators ─────────────────────────────────────────────────────────────

    /// Insert `value` into the set.
    ///
    /// Returns `true` if the value was newly added, `false` if it already
    /// existed (no-op).
    pub fn insert<V>(env: &Env, tier: StorageTier, ns: &Symbol, value: &V) -> bool
    where
        V: IntoVal<Env, Val> + TryFromVal<Env, Val> + Clone,
    {
        let payload = val_payload(env, value);
        let index_key = SetKey::Index(ns.clone(), payload);

        // Already present — nothing to do.
        if tier.has(env, &index_key) {
            return false;
        }

        let values_key = SetKey::Values(ns.clone());
        let mut vec: Vec<V> = tier.get(env, &values_key).unwrap_or_else(|| Vec::new(env));

        vec.push_back(value.clone());
        let one_based_index = vec.len(); // length after push == 1-based index of new element

        tier.set(env, &values_key, &vec);
        tier.set(env, &SetKey::Count(ns.clone()), &one_based_index);
        tier.set(env, &index_key, &one_based_index);

        true
    }

    /// Remove `value` from the set using the swap-with-last algorithm.
    ///
    /// Returns `true` if the value was present (and removed), `false` if it
    /// was not a member.
    pub fn remove<V>(env: &Env, tier: StorageTier, ns: &Symbol, value: &V) -> bool
    where
        V: IntoVal<Env, Val> + TryFromVal<Env, Val> + Clone,
    {
        let payload = val_payload(env, value);
        let index_key = SetKey::Index(ns.clone(), payload);

        let one_based: u32 = match tier.get(env, &index_key) {
            Some(i) => i,
            None => return false, // not a member
        };

        let values_key = SetKey::Values(ns.clone());
        let mut vec: Vec<V> = tier.get(env, &values_key).unwrap_or_else(|| Vec::new(env));

        let zero_based = one_based - 1;
        let last_idx = vec.len() - 1;

        if zero_based != last_idx {
            // Swap the target with the last element.
            let last_val: V = vec.get(last_idx).unwrap();
            vec.set(zero_based, last_val.clone());

            // Update the index of the element that moved.
            let last_payload = val_payload(env, &last_val);
            let last_index_key = SetKey::Index(ns.clone(), last_payload);
            tier.set(env, &last_index_key, &one_based); // it now occupies the freed slot
        }

        vec.pop_back(); // remove last (was either target or swapped copy)
        tier.set(env, &values_key, &vec);
        tier.set(env, &SetKey::Count(ns.clone()), &vec.len());
        tier.remove(env, &index_key);

        true
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    /// Returns `true` if `value` is a member of the set.
    pub fn contains<V>(env: &Env, tier: StorageTier, ns: &Symbol, value: &V) -> bool
    where
        V: IntoVal<Env, Val>,
    {
        let payload = val_payload(env, value);
        tier.has(env, &SetKey::Index(ns.clone(), payload))
    }

    /// Returns the number of elements in the set.
    pub fn length<V>(env: &Env, tier: StorageTier, ns: &Symbol) -> u32
    where
        V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
    {
        tier.get(env, &SetKey::Count(ns.clone())).unwrap_or(0)
    }

    /// Returns all members as an ordered `Vec<V>`.
    ///
    /// Allocation is O(n); prefer using `at` for random access where possible.
    pub fn values<V>(env: &Env, tier: StorageTier, ns: &Symbol) -> Vec<V>
    where
        V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
    {
        tier.get(env, &SetKey::Values(ns.clone()))
            .unwrap_or_else(|| Vec::new(env))
    }

    /// Returns the element at 0-based `index`, or `None` if out of bounds.
    pub fn at<V>(env: &Env, tier: StorageTier, ns: &Symbol, index: u32) -> Option<V>
    where
        V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
    {
        let vec: Vec<V> = tier
            .get(env, &SetKey::Values(ns.clone()))
            .unwrap_or_else(|| Vec::new(env));
        vec.get(index)
    }
}
