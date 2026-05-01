use proptest::prelude::*;

/// A reusable contract test harness for property-based testing.
///
/// This module provides helpers and macros that standardize the pattern used by
/// contract fuzz tests across the repository.

/// An invariant assertion expressed as a message/condition pair.
pub type InvariantCheck = (&'static str, bool);

/// Checks a list of invariants and panics if any fail.
pub fn check_invariants(invariants: &[InvariantCheck]) {
    for (message, condition) in invariants {
        if !*condition {
            panic!("Invariant failed: {}", message);
        }
    }
}

/// Macro to define a property-based fuzz test with a consistent harness.
///
/// Example:
///
/// ```ignore
/// property_test!(fuzz_ticket_transfer, 0u128..100u128, {
///     assert_invariant(value >= 0, "token id must be non-negative");
/// });
/// ```
#[macro_export]
macro_rules! property_test {
    ($name:ident, $strategy:expr, $body:block) => {
        ::proptest::proptest! {
            #[test]
            fn $name(value in $strategy) $body
        }
    };
}

/// Example reusable invariant template for contract state checks.
///
/// This helper can be called from contract fuzz tests to assert multiple invariants
/// in a single place.
pub fn invariant_template(state_name: &str, invariants: &[InvariantCheck]) {
    let prefix = format!("{} invariant", state_name);
    for (message, condition) in invariants {
        if !*condition {
            panic!("{}: {}", prefix, message);
        }
    }
}
