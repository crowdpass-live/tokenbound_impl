# ERC-721 Compatibility Traits for Soroban

This module provides Rust trait definitions that implement the ERC-721 standard interface for Soroban-based NFT contracts. The traits enable developers to create NFT contracts that are compatible with the Ethereum ERC-721 standard while leveraging Soroban's unique features.

## Overview

ERC-721 is the Ethereum standard for non-fungible tokens (NFTs). This module translates that standard into Soroban Rust traits, making it easier for Soroban NFT implementations to be compatible with ERC-721 expectations.

## Core Traits

### `Erc721` Trait

The main trait that defines the core ERC-721 functionality:

```rust
pub trait Erc721 {
    fn name() -> String;
    fn symbol() -> String;
    fn total_supply() -> u128;
    fn balance_of(owner: Address) -> u128;
    fn owner_of(token_id: u128) -> Address;
    fn transfer_from(from: Address, to: Address, token_id: u128) -> Result<(), Erc721Error>;
    fn approve(to: Address, token_id: u128) -> Result<(), Erc721Error>;
    fn set_approval_for_all(operator: Address, approved: bool) -> Result<(), Erc721Error>;
    // ... more methods
}
```

### `Erc721Metadata` (Optional Extension)

Provides metadata functionality for tokens:

```rust
pub trait Erc721Metadata {
    fn name() -> String;
    fn symbol() -> String;
    fn token_uri(token_id: u128) -> Result<String, Erc721Error>;
}
```

### `Erc721Enumerable` (Optional Extension)

Provides token enumeration functionality:

```rust
pub trait Erc721Enumerable {
    fn total_supply() -> u128;
    fn token_by_index(index: u128) -> Result<u128, Erc721Error>;
    fn token_of_owner_by_index(owner: Address, index: u128) -> Result<u128, Erc721Error>;
}
```

### `Erc721Burnable` (Optional Extension)

Allows tokens to be destroyed:

```rust
pub trait Erc721Burnable {
    fn burn(token_id: u128) -> Result<(), Erc721Error>;
}
```

## Event Types

### TransferEvent
Emitted when a token is transferred from one account to another.

### ApprovalEvent
Emitted when the approved address for a token is changed or reaffirmed.

### ApprovalForAllEvent
Emitted when an operator is enabled or disabled for an owner.

## Error Handling

The module defines the `Erc721Error` enum for common error conditions:

- `InvalidTokenId`: The token does not exist
- `Unauthorized`: The caller is not authorized
- `RecipientAlreadyHasToken`: Recipient already owns a token (for single-token contracts)
- `ArithmeticOverflow`: Arithmetic operation overflow
- `ContractPaused`: The contract is paused
- `NotInitialized`: The contract is not initialized
- `InvalidRecipient`: Invalid recipient address
- `TokenUriNotFound`: Token URI not found

## Usage Example

Implementing a contract that uses the ERC-721 traits:

```rust
use erc721_traits::{Erc721, Erc721Metadata, Erc721Error};
use soroban_sdk::{contract, contractimpl, Env, Address, String};

#[contract]
pub struct MyNftContract;

#[contractimpl]
impl Erc721 for MyNftContract {
    fn name() -> String {
        String::from_str(&env, "My NFT")
    }
    
    fn symbol() -> String {
        String::from_str(&env, "MNFT")
    }
    
    // ... implement other trait methods
}
```

## Integration with Existing Contracts

The ERC-721 traits module is designed to work with existing Soroban contracts:

- **ticket_nft**: The ticket NFT contract can implement the `Erc721` and `Erc721Metadata` traits
- **tba_account**: Can leverage ERC-721 ownership verification
- **marketplace**: Can use the traits for standardized NFT interactions

## Benefits

1. **Standard Compliance**: Ensures NFT contracts follow the ERC-721 standard
2. **Interoperability**: Makes contracts compatible with ERC-721 expecting tools and services
3. **Developer Experience**: Provides clear, typed interfaces for NFT operations
4. **Error Handling**: Comprehensive error types for common failure cases
5. **Extensibility**: Trait-based design allows for custom implementations and extensions

## Next Steps

- Implement the `Erc721` trait in the `ticket_nft` contract
- Add event emission for transfer, approval, and approval-for-all events
- Implement optional extensions (Metadata, Enumerable, Burnable)
- Add comprehensive tests for trait implementations
- Update contract documentation with ERC-721 compatibility information
