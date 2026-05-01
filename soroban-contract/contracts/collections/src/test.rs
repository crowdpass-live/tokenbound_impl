//! Unit tests for `collections` — EnumerableSet and EnumerableMap.
//!
//! Coverage goals:
//! * Insert, duplicate insert (idempotent), contains, remove, re-insert
//! * Remove-from-middle (swap-with-last correctness for both Set and Map)
//! * EnumerableMap: insert / update / remove / get / values / entries / key_at
//! * Empty-collection edge cases (length, values, contains, get)
//! * Both Instance and Persistent StorageTier variants
//!   (Temporary behaves identically to Persistent in the test env)
//!
//! Soroban storage can only be accessed from within a contract execution
//! context.  All test bodies are therefore wrapped with `env.as_contract()`
//! using a registered dummy contract.

#![cfg(test)]

extern crate std;

use soroban_sdk::{contract, contractimpl, symbol_short, Env};

use crate::{EnumerableMap, EnumerableSet, StorageTier};

// ────────────────────────────────────────────────────────────────────────────
// Dummy contract — gives us a valid contract address to use with as_contract()
// ────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct DummyContract;

#[contractimpl]
impl DummyContract {}

/// Register a fresh dummy contract and return (env, contract_id).
fn setup() -> (Env, soroban_sdk::Address) {
    let env = Env::default();
    let id = env.register(DummyContract, ());
    (env, id)
}

// ────────────────────────────────────────────────────────────────────────────
// EnumerableSet — Instance storage
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn set_insert_and_contains_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("owners");
        assert!(!EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns, &1u32));
        assert!(EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &1u32));
        assert!(EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns, &1u32));
    });
}

#[test]
fn set_insert_duplicate_is_idempotent_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("dedup");
        assert!(EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &42u32));
        assert!(!EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &42u32));
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns), 1);
    });
}

#[test]
fn set_length_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("len");
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns), 0);
        EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &1u32);
        EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &2u32);
        EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &3u32);
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns), 3);
    });
}

#[test]
fn set_values_returns_all_members_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("vals");
        for i in 0u32..5 {
            EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &i);
        }
        let v = EnumerableSet::values::<u32>(&env, StorageTier::Instance, &ns);
        assert_eq!(v.len(), 5);
    });
}

#[test]
fn set_at_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("at");
        EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &10u32);
        EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &20u32);
        assert_eq!(EnumerableSet::at::<u32>(&env, StorageTier::Instance, &ns, 0), Some(10u32));
        assert_eq!(EnumerableSet::at::<u32>(&env, StorageTier::Instance, &ns, 1), Some(20u32));
        assert_eq!(EnumerableSet::at::<u32>(&env, StorageTier::Instance, &ns, 2), None);
    });
}

#[test]
fn set_remove_last_element_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("rmlast");
        EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &99u32);
        assert!(EnumerableSet::remove::<u32>(&env, StorageTier::Instance, &ns, &99u32));
        assert!(!EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns, &99u32));
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns), 0);
    });
}

#[test]
fn set_remove_absent_returns_false_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("rmabs");
        assert!(!EnumerableSet::remove::<u32>(&env, StorageTier::Instance, &ns, &7u32));
    });
}

#[test]
fn set_remove_middle_swap_correctness_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("rmid");
        for i in 0u32..5 {
            EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &i);
        }
        assert!(EnumerableSet::remove::<u32>(&env, StorageTier::Instance, &ns, &2u32));
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns), 4);
        assert!(!EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns, &2u32));
        for i in [0u32, 1, 3, 4] {
            assert!(
                EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns, &i),
                "value {i} should still be in the set"
            );
        }
    });
}

#[test]
fn set_remove_and_reinsert_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("reins");
        EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &5u32);
        assert!(EnumerableSet::remove::<u32>(&env, StorageTier::Instance, &ns, &5u32));
        assert!(EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &5u32));
        assert!(EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns, &5u32));
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns), 1);
    });
}

// ────────────────────────────────────────────────────────────────────────────
// EnumerableSet — Persistent storage
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn set_insert_and_contains_persistent() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("powners");
        assert!(EnumerableSet::insert::<u32>(&env, StorageTier::Persistent, &ns, &1u32));
        assert!(EnumerableSet::contains::<u32>(&env, StorageTier::Persistent, &ns, &1u32));
        assert!(!EnumerableSet::contains::<u32>(&env, StorageTier::Persistent, &ns, &2u32));
    });
}

#[test]
fn set_remove_middle_persistent() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("prmid");
        for i in 0u32..4 {
            EnumerableSet::insert::<u32>(&env, StorageTier::Persistent, &ns, &i);
        }
        assert!(EnumerableSet::remove::<u32>(&env, StorageTier::Persistent, &ns, &1u32));
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Persistent, &ns), 3);
        assert!(!EnumerableSet::contains::<u32>(&env, StorageTier::Persistent, &ns, &1u32));
        for i in [0u32, 2, 3] {
            assert!(EnumerableSet::contains::<u32>(&env, StorageTier::Persistent, &ns, &i));
        }
    });
}

// ────────────────────────────────────────────────────────────────────────────
// EnumerableSet — Temporary storage
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn set_insert_and_remove_temporary() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("tmp");
        assert!(EnumerableSet::insert::<u32>(&env, StorageTier::Temporary, &ns, &77u32));
        assert!(EnumerableSet::contains::<u32>(&env, StorageTier::Temporary, &ns, &77u32));
        assert!(EnumerableSet::remove::<u32>(&env, StorageTier::Temporary, &ns, &77u32));
        assert!(!EnumerableSet::contains::<u32>(&env, StorageTier::Temporary, &ns, &77u32));
    });
}

// ────────────────────────────────────────────────────────────────────────────
// EnumerableSet — namespace isolation
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn set_namespaces_are_isolated() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns_a = symbol_short!("nsA");
        let ns_b = symbol_short!("nsB");
        EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns_a, &1u32);
        assert!(EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns_a, &1u32));
        assert!(!EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns_b, &1u32));
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns_b), 0);
    });
}

// ────────────────────────────────────────────────────────────────────────────
// EnumerableMap — Instance storage
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn map_insert_and_get_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("balances");
        assert!(!EnumerableMap::contains_key::<u32>(&env, StorageTier::Instance, &ns, &1u32));
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32, &100i128);
        assert!(EnumerableMap::contains_key::<u32>(&env, StorageTier::Instance, &ns, &1u32));
        assert_eq!(
            EnumerableMap::get::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32),
            Some(100i128)
        );
    });
}

#[test]
fn map_insert_update_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("balu");
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32, &50i128);
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32, &200i128);
        assert_eq!(EnumerableMap::length::<u32>(&env, StorageTier::Instance, &ns), 1);
        assert_eq!(
            EnumerableMap::get::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32),
            Some(200i128)
        );
    });
}

#[test]
fn map_get_missing_returns_none_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("none");
        assert_eq!(
            EnumerableMap::get::<u32, i128>(&env, StorageTier::Instance, &ns, &99u32),
            None
        );
    });
}

#[test]
fn map_length_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("maplen");
        assert_eq!(EnumerableMap::length::<u32>(&env, StorageTier::Instance, &ns), 0);
        for i in 0u32..3 {
            EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &i, &(i as i128 * 10));
        }
        assert_eq!(EnumerableMap::length::<u32>(&env, StorageTier::Instance, &ns), 3);
    });
}

#[test]
fn map_keys_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("mapkeys");
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &10u32, &1i128);
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &20u32, &2i128);
        let keys = EnumerableMap::keys::<u32>(&env, StorageTier::Instance, &ns);
        assert_eq!(keys.len(), 2);
        assert_eq!(keys.get(0), Some(10u32));
        assert_eq!(keys.get(1), Some(20u32));
    });
}

#[test]
fn map_values_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("mapvals");
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32, &11i128);
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &2u32, &22i128);
        let vals = EnumerableMap::values::<u32, i128>(&env, StorageTier::Instance, &ns);
        assert_eq!(vals.len(), 2);
        assert_eq!(vals.get(0), Some(11i128));
        assert_eq!(vals.get(1), Some(22i128));
    });
}

#[test]
fn map_entries_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("entries");
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32, &100i128);
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &2u32, &200i128);
        let (keys, vals) = EnumerableMap::entries::<u32, i128>(&env, StorageTier::Instance, &ns);
        assert_eq!(keys.len(), 2);
        assert_eq!(vals.len(), 2);
        assert_eq!(keys.get(0), Some(1u32));
        assert_eq!(vals.get(0), Some(100i128));
        assert_eq!(keys.get(1), Some(2u32));
        assert_eq!(vals.get(1), Some(200i128));
    });
}

#[test]
fn map_key_at_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("keyat");
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &7u32, &70i128);
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &8u32, &80i128);
        assert_eq!(EnumerableMap::key_at::<u32>(&env, StorageTier::Instance, &ns, 0), Some(7u32));
        assert_eq!(EnumerableMap::key_at::<u32>(&env, StorageTier::Instance, &ns, 1), Some(8u32));
        assert_eq!(EnumerableMap::key_at::<u32>(&env, StorageTier::Instance, &ns, 2), None);
    });
}

#[test]
fn map_remove_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("maprm");
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32, &10i128);
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &2u32, &20i128);
        assert!(EnumerableMap::remove::<u32>(&env, StorageTier::Instance, &ns, &1u32));
        assert!(!EnumerableMap::contains_key::<u32>(&env, StorageTier::Instance, &ns, &1u32));
        assert_eq!(EnumerableMap::get::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32), None);
        assert_eq!(EnumerableMap::length::<u32>(&env, StorageTier::Instance, &ns), 1);
        assert_eq!(
            EnumerableMap::get::<u32, i128>(&env, StorageTier::Instance, &ns, &2u32),
            Some(20i128)
        );
    });
}

#[test]
fn map_remove_absent_returns_false_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("rmabs2");
        assert!(!EnumerableMap::remove::<u32>(&env, StorageTier::Instance, &ns, &99u32));
    });
}

#[test]
fn map_remove_middle_swap_correctness_instance() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("mmid");
        for i in 0u32..5 {
            EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns, &i, &(i as i128 * 10));
        }
        assert!(EnumerableMap::remove::<u32>(&env, StorageTier::Instance, &ns, &2u32));
        assert_eq!(EnumerableMap::length::<u32>(&env, StorageTier::Instance, &ns), 4);
        assert!(!EnumerableMap::contains_key::<u32>(&env, StorageTier::Instance, &ns, &2u32));
        assert_eq!(EnumerableMap::get::<u32, i128>(&env, StorageTier::Instance, &ns, &2u32), None);
        for i in [0u32, 1, 3, 4] {
            assert!(EnumerableMap::contains_key::<u32>(&env, StorageTier::Instance, &ns, &i));
            assert_eq!(
                EnumerableMap::get::<u32, i128>(&env, StorageTier::Instance, &ns, &i),
                Some(i as i128 * 10)
            );
        }
    });
}

// ────────────────────────────────────────────────────────────────────────────
// EnumerableMap — Persistent storage
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn map_insert_and_remove_persistent() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("pmap");
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Persistent, &ns, &5u32, &55i128);
        assert_eq!(
            EnumerableMap::get::<u32, i128>(&env, StorageTier::Persistent, &ns, &5u32),
            Some(55i128)
        );
        assert!(EnumerableMap::remove::<u32>(&env, StorageTier::Persistent, &ns, &5u32));
        assert_eq!(
            EnumerableMap::get::<u32, i128>(&env, StorageTier::Persistent, &ns, &5u32),
            None
        );
    });
}

// ────────────────────────────────────────────────────────────────────────────
// EnumerableMap — namespace isolation
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn map_namespaces_are_isolated() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns_a = symbol_short!("mnsA");
        let ns_b = symbol_short!("mnsB");
        EnumerableMap::insert::<u32, i128>(&env, StorageTier::Instance, &ns_a, &1u32, &999i128);
        assert!(EnumerableMap::contains_key::<u32>(&env, StorageTier::Instance, &ns_a, &1u32));
        assert!(!EnumerableMap::contains_key::<u32>(&env, StorageTier::Instance, &ns_b, &1u32));
        assert_eq!(EnumerableMap::length::<u32>(&env, StorageTier::Instance, &ns_b), 0);
    });
}

// ────────────────────────────────────────────────────────────────────────────
// Edge cases — empty collections
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn set_empty_collection_queries() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("empty");
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns), 0);
        assert_eq!(EnumerableSet::values::<u32>(&env, StorageTier::Instance, &ns).len(), 0);
        assert!(!EnumerableSet::contains::<u32>(&env, StorageTier::Instance, &ns, &1u32));
        assert_eq!(EnumerableSet::at::<u32>(&env, StorageTier::Instance, &ns, 0), None);
        assert!(!EnumerableSet::remove::<u32>(&env, StorageTier::Instance, &ns, &1u32));
    });
}

#[test]
fn map_empty_collection_queries() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("emptyM");
        assert_eq!(EnumerableMap::length::<u32>(&env, StorageTier::Instance, &ns), 0);
        assert_eq!(EnumerableMap::keys::<u32>(&env, StorageTier::Instance, &ns).len(), 0);
        assert_eq!(EnumerableMap::values::<u32, i128>(&env, StorageTier::Instance, &ns).len(), 0);
        assert_eq!(EnumerableMap::entries::<u32, i128>(&env, StorageTier::Instance, &ns).0.len(), 0);
        assert!(!EnumerableMap::contains_key::<u32>(&env, StorageTier::Instance, &ns, &1u32));
        assert_eq!(EnumerableMap::get::<u32, i128>(&env, StorageTier::Instance, &ns, &1u32), None);
        assert_eq!(EnumerableMap::key_at::<u32>(&env, StorageTier::Instance, &ns, 0), None);
        assert!(!EnumerableMap::remove::<u32>(&env, StorageTier::Instance, &ns, &1u32));
    });
}

// ────────────────────────────────────────────────────────────────────────────
// Large-set remove stress (swap-with-last consistency)
// ────────────────────────────────────────────────────────────────────────────

#[test]
fn set_remove_all_elements_one_by_one() {
    let (env, id) = setup();
    env.as_contract(&id, || {
        let ns = symbol_short!("rmall");
        let n = 10u32;
        for i in 0..n {
            EnumerableSet::insert::<u32>(&env, StorageTier::Instance, &ns, &i);
        }
        // Remove in an order that exercises different swap paths
        for i in [0u32, 5, 9, 1, 4, 2, 8, 3, 7, 6] {
            assert!(EnumerableSet::remove::<u32>(&env, StorageTier::Instance, &ns, &i));
        }
        assert_eq!(EnumerableSet::length::<u32>(&env, StorageTier::Instance, &ns), 0);
    });
}
