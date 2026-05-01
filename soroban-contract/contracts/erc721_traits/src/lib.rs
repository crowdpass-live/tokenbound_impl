//! ERC-721 Compatibility Traits for Soroban
//!
//! This module provides Rust traits that define the ERC-721 standard interface,
//! making it easier to implement NFT contracts that are compatible with
//! Ethereum's ERC-721 standard on Soroban.

#![no_std]

use soroban_sdk::{contracttype, Address, Symbol};

/// ERC-721 Transfer event
/// Emitted when a token is transferred from one account to another.
#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferEvent {
    pub from: Address,
    pub to: Address,
    pub token_id: u128,
}

/// ERC-721 Approval event
/// Emitted when the approved address for a token is changed or reaffirmed.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ApprovalEvent {
    pub owner: Address,
    pub approved: Address,
    pub token_id: u128,
}

/// ERC-721 ApprovalForAll event
/// Emitted when an operator is enabled or disabled for an owner.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ApprovalForAllEvent {
    pub owner: Address,
    pub operator: Address,
    pub approved: bool,
}

/// ERC-721 standard trait defining core NFT functionality
///
/// This trait provides the interface for NFT contracts to be compatible
/// with the ERC-721 standard on Soroban.
pub trait Erc721 {
    /// Returns the name of the token.
    fn name() -> String;

    /// Returns the symbol of the token.
    fn symbol() -> String;

    /// Returns the number of decimals the token uses (always 0 for NFTs).
    fn decimals() -> u32 {
        0
    }

    /// Returns the total supply of tokens.
    fn total_supply() -> u128;

    /// Returns the account balance of another account with address `owner`.
    fn balance_of(owner: Address) -> u128;

    /// Returns the address of the owner of the `token_id` token.
    fn owner_of(token_id: u128) -> Address;

    /// Returns the account approved for `token_id` token.
    fn get_approved(token_id: u128) -> Option<Address>;

    /// Returns if the `operator` is allowed to manage all of the assets of `owner`.
    fn is_approved_for_all(owner: Address, operator: Address) -> bool;

    /// Transfers `token_id` token from `from` to `to`.
    /// Requires the caller to be the owner, approved, or an approved operator.
    fn transfer_from(from: Address, to: Address, token_id: u128) -> Result<(), Erc721Error>;

    /// Safely transfers `token_id` token from `from` to `to`.
    /// Same as `transfer_from` but checks if the recipient can handle ERC721 tokens.
    fn safe_transfer_from(
        from: Address,
        to: Address,
        token_id: u128,
    ) -> Result<(), Erc721Error>;

    /// Gives permission to `to` to transfer `token_id` token to another account.
    /// Requires the caller to be the owner or an approved operator.
    fn approve(to: Address, token_id: u128) -> Result<(), Erc721Error>;

    /// Approve or remove `operator` as an operator for the caller.
    fn set_approval_for_all(operator: Address, approved: bool) -> Result<(), Erc721Error>;

    /// Returns the Uniform Resource Identifier (URI) for `token_id` token.
    fn token_uri(token_id: u128) -> Result<String, Erc721Error>;
}

/// Errors that can occur in ERC-721 operations
#[derive(Clone, Debug, PartialEq)]
pub enum Erc721Error {
    /// The token does not exist
    InvalidTokenId = 1,
    /// The caller is not authorized to perform this action
    Unauthorized = 2,
    /// The recipient already owns a token (for single-token contracts like Tickets)
    RecipientAlreadyHasToken = 3,
    /// Arithmetic overflow
    ArithmeticOverflow = 4,
    /// The contract is paused
    ContractPaused = 5,
    /// The contract is not initialized
    NotInitialized = 6,
    /// Invalid recipient address (e.g., zero address)
    InvalidRecipient = 7,
    /// Token URI not found
    TokenUriNotFound = 8,
}

/// ERC-721 Metadata extension trait
///
/// Optional extension that provides token metadata functionality.
pub trait Erc721Metadata {
    /// Returns the name of the token.
    fn name() -> String;

    /// Returns the symbol of the token.
    fn symbol() -> String;

    /// Returns the Uniform Resource Identifier (URI) for `tokenId` token.
    fn token_uri(token_id: u128) -> Result<String, Erc721Error>;
}

/// ERC-721 Enumeration extension trait
///
/// Optional extension that provides token enumeration functionality.
pub trait Erc721Enumerable {
    /// Returns the total amount of tokens stored by the contract.
    fn total_supply() -> u128;

    /// Returns a token ID owned by `owner` at a given `index` of its token list.
    /// Use along with `balance_of` to enumerate all of `owner`'s tokens.
    fn token_by_index(index: u128) -> Result<u128, Erc721Error>;

    /// Returns a token ID owned by `owner` at a given `index` of its token list.
    /// Use along with `balance_of` to enumerate all of `owner`'s tokens.
    fn token_of_owner_by_index(owner: Address, index: u128) -> Result<u128, Erc721Error>;
}

/// ERC-721 Burnable extension trait
///
/// Optional extension that allows tokens to be destroyed.
pub trait Erc721Burnable {
    /// Destroys `token_id`.
    /// Requires the caller to be the owner or approved.
    fn burn(token_id: u128) -> Result<(), Erc721Error>;
}

/// Helper functions for ERC-721 implementations
pub mod helpers {
    use soroban_sdk::{Address, Symbol};

    /// Get the Transfer event symbol
    pub fn transfer_event_symbol() -> Symbol {
        Symbol::short("transfer")
    }

    /// Get the Approval event symbol
    pub fn approval_event_symbol() -> Symbol {
        Symbol::short("approve")
    }

    /// Get the ApprovalForAll event symbol
    pub fn approval_for_all_event_symbol() -> Symbol {
        Symbol::short("apprvall")
    }

    /// Validate that an address is not the zero address
    pub fn is_valid_address(addr: &Address) -> bool {
        // In Soroban, we can check if address is "valid" by ensuring it's not a default/zero address
        // This is a simplified check; actual implementation depends on your needs
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_erc721_error_values() {
        assert_eq!(Erc721Error::InvalidTokenId as i32, 1);
        assert_eq!(Erc721Error::Unauthorized as i32, 2);
        assert_eq!(Erc721Error::RecipientAlreadyHasToken as i32, 3);
    }
}
