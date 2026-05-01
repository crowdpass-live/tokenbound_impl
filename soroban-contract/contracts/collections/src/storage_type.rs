//! Storage tier selector used by both `EnumerableSet` and `EnumerableMap`.

use soroban_sdk::{Env, IntoVal, TryFromVal, Val};

/// Which Soroban storage tier to use for a collection.
///
/// Pass this to every [`EnumerableSet`](super::EnumerableSet) or
/// [`EnumerableMap`](super::EnumerableMap) function.  All keys in a single
/// collection must use the same tier.
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum StorageTier {
    /// `env.storage().instance()` — shared across the whole contract instance.
    Instance,
    /// `env.storage().persistent()` — survives ledger closings; TTL must be
    /// extended explicitly.
    Persistent,
    /// `env.storage().temporary()` — automatically expires after the TTL
    /// window; no rent required.
    Temporary,
}

impl StorageTier {
    /// Read a value from the selected storage tier.
    #[inline]
    pub fn get<K, V>(&self, env: &Env, key: &K) -> Option<V>
    where
        K: IntoVal<Env, Val>,
        V: TryFromVal<Env, Val>,
    {
        match self {
            StorageTier::Instance => env.storage().instance().get(key),
            StorageTier::Persistent => env.storage().persistent().get(key),
            StorageTier::Temporary => env.storage().temporary().get(key),
        }
    }

    /// Write a value to the selected storage tier.
    #[inline]
    pub fn set<K, V>(&self, env: &Env, key: &K, val: &V)
    where
        K: IntoVal<Env, Val>,
        V: IntoVal<Env, Val>,
    {
        match self {
            StorageTier::Instance => env.storage().instance().set(key, val),
            StorageTier::Persistent => env.storage().persistent().set(key, val),
            StorageTier::Temporary => env.storage().temporary().set(key, val),
        }
    }

    /// Remove a key from the selected storage tier.
    #[inline]
    pub fn remove<K>(&self, env: &Env, key: &K)
    where
        K: IntoVal<Env, Val>,
    {
        match self {
            StorageTier::Instance => env.storage().instance().remove(key),
            StorageTier::Persistent => env.storage().persistent().remove(key),
            StorageTier::Temporary => env.storage().temporary().remove(key),
        }
    }

    /// Check whether a key exists in the selected storage tier.
    #[inline]
    pub fn has<K>(&self, env: &Env, key: &K) -> bool
    where
        K: IntoVal<Env, Val>,
    {
        match self {
            StorageTier::Instance => env.storage().instance().has(key),
            StorageTier::Persistent => env.storage().persistent().has(key),
            StorageTier::Temporary => env.storage().temporary().has(key),
        }
    }
}
