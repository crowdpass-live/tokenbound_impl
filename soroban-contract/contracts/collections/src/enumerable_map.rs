//! Enumerable map utility for Soroban storage.
//!
//! # Storage layout
//!
//! For each (namespace, StorageTier) pair the map occupies **three** storage
//! slots per unique key plus one Vec slot:
//!
//! | Key variant                  | Type     | Description                        |
//! |------------------------------|----------|------------------------------------|
//! | `MapKeys(namespace)`         | `Vec<K>` | Ordered list of map keys           |
//! | `MapKeyIndex(namespace, u64)`| `u32`    | 1-based position; field is payload |
//! | `MapValue(namespace, u64)`   | `V`      | The value for the key              |
//!
//! The key's `Val` raw payload (a `u64`) is used as the discriminant in both
//! index and value storage keys, avoiding XDR limitations on `Val` fields
//! inside `#[contracttype]` variants.
//!
//! # Insert / update semantics
//!
//! Calling `insert` with a key that already exists **updates** the stored
//! value without changing the key order.
//!
//! # Removal algorithm — swap-with-last
//!
//! Identical to [`EnumerableSet`](super::EnumerableSet): the removed key slot
//! is filled by the last key in the Vec, keeping all indices consistent in
//! O(1) storage operations.

use soroban_sdk::{contracttype, IntoVal, Symbol, TryFromVal, Val, Vec};

use crate::storage_type::StorageTier;
use soroban_sdk::Env;

// ── Storage key types ────────────────────────────────────────────────────────

/// Storage key variants for [`EnumerableMap`].
#[contracttype]
#[derive(Clone, Debug)]
pub enum MapKey {
    /// The ordered `Vec<K>` of map keys.
    Keys(Symbol),
    /// Cached number of entries in the map.
    Count(Symbol),
    /// 1-based position of a key.  The `u64` is the key's raw `Val` payload.
    KeyIndex(Symbol, u64),
    /// The value stored for a key.  The `u64` is the key's raw `Val` payload.
    Value(Symbol, u64),
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Extract the raw bit-pattern of a `Val` for use as a storage key discriminant.
#[inline]
fn val_payload<K: IntoVal<Env, Val>>(env: &Env, k: &K) -> u64 {
    k.into_val(env).get_payload()
}

// ── Public API ───────────────────────────────────────────────────────────────

/// Stateless, namespace-scoped enumerable map stored in Soroban.
///
/// All functions are free (not methods); the caller supplies the [`Env`],
/// the [`StorageTier`], and a *namespace* [`Symbol`] that scopes all keys.
pub struct EnumerableMap;

impl EnumerableMap {
    // ── Mutators ─────────────────────────────────────────────────────────────

    /// Insert or update the entry `(key, value)`.
    ///
    /// * If `key` is **new** the key is appended to the ordered list and the
    ///   value is written.
    /// * If `key` **already exists** only the value is updated; key order is
    ///   unchanged.
    pub fn insert<K, V>(env: &Env, tier: StorageTier, ns: &Symbol, key: &K, value: &V)
    where
        K: IntoVal<Env, Val> + TryFromVal<Env, Val> + Clone,
        V: IntoVal<Env, Val>,
    {
        let payload = val_payload(env, key);
        let index_key = MapKey::KeyIndex(ns.clone(), payload);
        let value_key = MapKey::Value(ns.clone(), payload);

        if !tier.has(env, &index_key) {
            // New key — append to Vec and record its index.
            let keys_key = MapKey::Keys(ns.clone());
            let mut vec: Vec<K> =
                tier.get(env, &keys_key).unwrap_or_else(|| Vec::new(env));
            vec.push_back(key.clone());
            let one_based = vec.len();
            tier.set(env, &keys_key, &vec);
            tier.set(env, &MapKey::Count(ns.clone()), &one_based);
            tier.set(env, &index_key, &one_based);
        }

        tier.set(env, &value_key, value);
    }

    /// Remove the entry for `key`.
    ///
    /// Returns `true` if the key was present (and removed), `false` if it did
    /// not exist.
    pub fn remove<K>(env: &Env, tier: StorageTier, ns: &Symbol, key: &K) -> bool
    where
        K: IntoVal<Env, Val> + TryFromVal<Env, Val> + Clone,
    {
        let payload = val_payload(env, key);
        let index_key = MapKey::KeyIndex(ns.clone(), payload);

        let one_based: u32 = match tier.get(env, &index_key) {
            Some(i) => i,
            None => return false,
        };

        let keys_key = MapKey::Keys(ns.clone());
        let mut vec: Vec<K> = tier.get(env, &keys_key).unwrap_or_else(|| Vec::new(env));

        let zero_based = one_based - 1;
        let last_idx = vec.len() - 1;

        if zero_based != last_idx {
            // Move the last key into the freed slot.
            let last_key: K = vec.get(last_idx).unwrap();
            vec.set(zero_based, last_key.clone());
            let last_payload = val_payload(env, &last_key);
            let last_index_key = MapKey::KeyIndex(ns.clone(), last_payload);
            tier.set(env, &last_index_key, &one_based);
        }

        vec.pop_back();
        tier.set(env, &keys_key, &vec);
        tier.set(env, &MapKey::Count(ns.clone()), &vec.len());

        // Delete the index and value for the removed key.
        tier.remove(env, &index_key);
        tier.remove(env, &MapKey::Value(ns.clone(), payload));

        true
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    /// Returns `true` if `key` is present in the map.
    pub fn contains_key<K>(env: &Env, tier: StorageTier, ns: &Symbol, key: &K) -> bool
    where
        K: IntoVal<Env, Val>,
    {
        let payload = val_payload(env, key);
        tier.has(env, &MapKey::KeyIndex(ns.clone(), payload))
    }

    /// Returns the value for `key`, or `None` if not present.
    pub fn get<K, V>(env: &Env, tier: StorageTier, ns: &Symbol, key: &K) -> Option<V>
    where
        K: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        let payload = val_payload(env, key);
        tier.get(env, &MapKey::Value(ns.clone(), payload))
    }

    /// Returns the number of entries in the map.
    pub fn length<K>(env: &Env, tier: StorageTier, ns: &Symbol) -> u32
    where
        K: IntoVal<Env, Val> + TryFromVal<Env, Val>,
    {
        tier.get(env, &MapKey::Count(ns.clone())).unwrap_or(0)
    }

    /// Returns all keys in insertion order.
    pub fn keys<K>(env: &Env, tier: StorageTier, ns: &Symbol) -> Vec<K>
    where
        K: IntoVal<Env, Val> + TryFromVal<Env, Val>,
    {
        tier.get(env, &MapKey::Keys(ns.clone()))
            .unwrap_or_else(|| Vec::new(env))
    }

    /// Returns all values in key-insertion order.
    pub fn values<K, V>(env: &Env, tier: StorageTier, ns: &Symbol) -> Vec<V>
    where
        K: IntoVal<Env, Val> + TryFromVal<Env, Val> + Clone,
        V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
    {
        let ks: Vec<K> = Self::keys(env, tier, ns);
        let mut result: Vec<V> = Vec::new(env);
        for k in ks.iter() {
            if let Some(v) = Self::get::<K, V>(env, tier, ns, &k) {
                result.push_back(v);
            }
        }
        result
    }

    /// Returns all keys and values in insertion order as two parallel `Vec`s.
    ///
    /// Soroban's `Vec<T>` cannot hold generic tuple types, so this function
    /// returns `(Vec<K>, Vec<V>)` instead of `Vec<(K, V)>`.  Both vecs have
    /// the same length and the same ordering.
    ///
    /// # Example
    /// ```rust,ignore
    /// let (keys, vals) = EnumerableMap::entries::<u32, i128>(&env, tier, &ns);
    /// for i in 0..keys.len() {
    ///     let k = keys.get(i).unwrap();
    ///     let v = vals.get(i).unwrap();
    /// }
    /// ```
    pub fn entries<K, V>(env: &Env, tier: StorageTier, ns: &Symbol) -> (Vec<K>, Vec<V>)
    where
        K: IntoVal<Env, Val> + TryFromVal<Env, Val> + Clone,
        V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
    {
        let ks: Vec<K> = Self::keys(env, tier, ns);
        let mut result_v: Vec<V> = Vec::new(env);
        for k in ks.iter() {
            if let Some(v) = Self::get::<K, V>(env, tier, ns, &k) {
                result_v.push_back(v);
            }
        }
        (ks, result_v)
    }

    /// Returns the key at 0-based `index`, or `None` if out of bounds.
    pub fn key_at<K>(env: &Env, tier: StorageTier, ns: &Symbol, index: u32) -> Option<K>
    where
        K: IntoVal<Env, Val> + TryFromVal<Env, Val>,
    {
        let vec: Vec<K> = tier
            .get(env, &MapKey::Keys(ns.clone()))
            .unwrap_or_else(|| Vec::new(env));
        vec.get(index)
    }
}
