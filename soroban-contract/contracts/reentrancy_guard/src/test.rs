#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env};

#[test]
fn test_reentrancy_guard_blocks_double_entry() {
    let env = Env::default();
    assert!(!is_locked(&env));
    assert_eq!(enter(&env).unwrap(), ());
    assert!(is_locked(&env));
    assert_eq!(enter(&env), Err(Error::Reentrant));
    exit(&env);
    assert!(!is_locked(&env));
}
