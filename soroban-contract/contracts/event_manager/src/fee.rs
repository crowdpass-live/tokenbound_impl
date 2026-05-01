#![no_std]
use soroban_sdk::{contracterror, contracttype};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum FeeError {
    FeeTooHigh = 100,
    MathOverflow = 101,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeConfig {
    /// Protocol fee in basis points (1 bp = 0.01%). E.g., 250 = 2.5%.
    pub protocol_fee_bps: u32,
}

impl FeeConfig {
    pub const BPS_DENOMINATOR: u32 = 10_000;
    pub const MAX_FEE_BPS: u32 = 2_500; // 25% maximum allowable fee

    /// Validates the fee configuration to ensure it doesn't exceed the maximum allowed fee.
    pub fn validate(&self) -> Result<(), FeeError> {
        if self.protocol_fee_bps > Self::MAX_FEE_BPS {
            return Err(FeeError::FeeTooHigh);
        }
        Ok(())
    }

    /// Calculates the protocol fee for a given transaction amount.
    /// Returns `FeeError::MathOverflow` if checked math operations fail.
    pub fn calculate_fee(&self, amount: i128) -> Result<i128, FeeError> {
        if self.protocol_fee_bps == 0 || amount <= 0 {
            return Ok(0);
        }

        let fee = amount
            .checked_mul(self.protocol_fee_bps as i128)
            .ok_or(FeeError::MathOverflow)?
            .checked_div(Self::BPS_DENOMINATOR as i128)
            .ok_or(FeeError::MathOverflow)?;

        Ok(fee)
    }

    /// Calculates the net amount (original amount minus the protocol fee).
    pub fn calculate_net_amount(&self, amount: i128) -> Result<i128, FeeError> {
        let fee = self.calculate_fee(amount)?;
        amount.checked_sub(fee).ok_or(FeeError::MathOverflow)
    }
}