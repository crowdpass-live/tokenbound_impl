#![cfg(test)]

use super::fee::{FeeConfig, FeeError};

#[test]
fn test_fee_calculation() {
    let config = FeeConfig {
        protocol_fee_bps: 250, // 2.5%
    };

    assert_eq!(config.validate(), Ok(()));

    let amount: i128 = 100_000; // 100.000 (USDC amounts scaled to Stroops or similar)
    let fee = config.calculate_fee(amount).unwrap();
    
    // 2.5% of 100,000 = 2,500
    assert_eq!(fee, 2_500);

    let net_amount = config.calculate_net_amount(amount).unwrap();
    assert_eq!(net_amount, 97_500);
}

#[test]
fn test_fee_too_high() {
    let config = FeeConfig {
        protocol_fee_bps: 3_000, // 30% (above 25% max)
    };

    assert_eq!(config.validate(), Err(FeeError::FeeTooHigh));
}

#[test]
fn test_zero_fee() {
    let config = FeeConfig { protocol_fee_bps: 0 };
    assert_eq!(config.calculate_fee(100_000).unwrap(), 0);
    assert_eq!(config.calculate_net_amount(100_000).unwrap(), 100_000);
}