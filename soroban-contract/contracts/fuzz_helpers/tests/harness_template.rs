use fuzz_helpers::{assert_invariant, harness::check_invariants, property_test};

property_test!(sample_property_harness, 0u32..10, {
    assert_invariant(value < 10, "value is within the expected range");
    check_invariants(&[("value is not negative", value >= 0)]);
});
