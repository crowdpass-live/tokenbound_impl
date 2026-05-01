extern crate std;

use proptest::prelude::*;

pub mod harness;

/// Reusable fuzz strategies for contract tests.
///
/// This helper crate is intended to be a shared library for soroban contract fuzz
/// tests. It centralizes common input generators and invariant assertions so
/// contract teams can write more consistent property-based tests.
pub fn arb_ascii_text(max_len: usize) -> impl Strategy<Value = std::string::String> {
    let regex = format!("[a-zA-Z0-9 ]{{0,{}}}", max_len);
    proptest::string::string_regex(&regex)
        .expect("invalid ASCII regex")
}

pub fn arb_i128_range(min: i128, max: i128) -> impl Strategy<Value = i128> {
    (min..max)
}

pub fn arb_u128_range(min: u128, max: u128) -> impl Strategy<Value = u128> {
    (min..max)
}

pub fn arb_u64_range(min: u64, max: u64) -> impl Strategy<Value = u64> {
    (min..max)
}

pub fn arb_u32_range(min: u32, max: u32) -> impl Strategy<Value = u32> {
    (min..max)
}

/// Simple invariant assertion helper for tests.
///
/// Use this to make invariant checks explicit and reusable across contract fuzz tests.
pub fn assert_invariant(condition: bool, message: &str) {
    if !condition {
        panic!("Invariant failed: {}", message);
    }
}
