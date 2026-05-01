#![allow(dead_code)]

use soroban_sdk::{Address, Env, Symbol, Vec, token, IntoVal};

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum TransferError {
    InsufficientBalance,
    InvalidAmount,
    InvalidRecipient,
    TokenContractError,
    NftTransferError,
    PartialBatchFailure,
}

pub type TransferResult<T> = Result<T, TransferError>;

pub fn transfer_token(
    env: &Env,
    token_address: &Address,
    from: &Address,
    to: &Address,
    amount: i128,
) -> TransferResult<()> {
    if amount <= 0 {
        return Err(TransferError::InvalidAmount);
    }

    let token_client = token::Client::new(env, token_address);
    
    let balance = token_client.balance(from);
    if balance < amount {
        return Err(TransferError::InsufficientBalance);
    }

    token_client.transfer(from, to, &amount);
    
    Ok(())
}

pub fn transfer_from(
    env: &Env,
    token_address: &Address,
    from: &Address,
    to: &Address,
    amount: i128,
    spender: &Address,
) -> TransferResult<()> {
    if amount <= 0 {
        return Err(TransferError::InvalidAmount);
    }

    let token_client = token::Client::new(env, token_address);
    
    let allowance = token_client.allowance(from, spender);
    if allowance < amount {
        return Err(TransferError::InsufficientBalance);
    }

    token_client.transfer_from(spender, from, to, &amount);
    
    Ok(())
}

pub fn transfer_nft(
    env: &Env,
    nft_contract: &Address,
    from: &Address,
    to: &Address,
    token_id: u128,
) -> TransferResult<()> {
    let args = soroban_sdk::vec![
        env,
        from.into_val(env),
        to.into_val(env),
        token_id.into_val(env),
    ];

    env.invoke_contract::<()>(
        nft_contract,
        &Symbol::new(env, "transfer_from"),
        args,
    );

    Ok(())
}

pub fn batch_transfer_tokens(
    env: &Env,
    token_address: &Address,
    from: &Address,
    recipients: Vec<(Address, i128)>,
) -> TransferResult<u32> {
    let token_client = token::Client::new(env, token_address);
    let mut successful_transfers = 0u32;

    for recipient_data in recipients.iter() {
        let (to, amount) = recipient_data;
        
        if amount <= 0 {
            continue;
        }

        let balance = token_client.balance(from);
        if balance < amount {
            continue;
        }

        token_client.transfer(from, &to, &amount);
        successful_transfers += 1;
    }

    if successful_transfers == 0 {
        return Err(TransferError::PartialBatchFailure);
    }

    Ok(successful_transfers)
}

pub fn get_token_balance(
    env: &Env,
    token_address: &Address,
    account: &Address,
) -> i128 {
    let token_client = token::Client::new(env, token_address);
    token_client.balance(account)
}

pub fn verify_nft_ownership(
    env: &Env,
    nft_contract: &Address,
    token_id: u128,
    expected_owner: &Address,
) -> bool {
    let owner: Address = env.invoke_contract(
        nft_contract,
        &Symbol::new(env, "owner_of"),
        soroban_sdk::vec![env, token_id.into_val(env)],
    );
    
    owner == *expected_owner
}

pub fn approve_token_transfer(
    env: &Env,
    token_address: &Address,
    owner: &Address,
    spender: &Address,
    amount: i128,
    expiration_ledger: u32,
) -> TransferResult<()> {
    if amount < 0 {
        return Err(TransferError::InvalidAmount);
    }

    let token_client = token::Client::new(env, token_address);
    token_client.approve(owner, spender, &amount, &expiration_ledger);
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_transfer_error_types() {
        assert_ne!(TransferError::InsufficientBalance, TransferError::InvalidAmount);
        assert_ne!(TransferError::InvalidRecipient, TransferError::TokenContractError);
    }

    #[test]
    fn test_invalid_amount_validation() {
        let env = Env::default();
        let token_addr = Address::generate(&env);
        let from = Address::generate(&env);
        let to = Address::generate(&env);

        let result = transfer_token(&env, &token_addr, &from, &to, 0);
        assert_eq!(result, Err(TransferError::InvalidAmount));

        let result = transfer_token(&env, &token_addr, &from, &to, -100);
        assert_eq!(result, Err(TransferError::InvalidAmount));
    }
}
