# DAO Governance Contract

A flexible and comprehensive DAO governance contract template for Soroban, designed to support various governance models with token-based voting, proposal management, and execution capabilities.

## Features

### Core Governance Features
- **Token-Based Voting**: Uses any ERC-20 compatible token for voting power
- **Flexible Proposal Types**: Support for general proposals, contract calls, parameter changes, and member management
- **Configurable Parameters**: Customizable voting periods, quorum requirements, and execution delays
- **Proposal Threshold**: Minimum voting power required to create proposals
- **Timelocked Execution**: Optional delays between voting end and execution

### Security Features
- **Upgradeable**: Built on the upgradeable contract framework
- **Pausable**: Emergency pause functionality
- **Access Control**: Admin-controlled initialization and member management
- **Event Logging**: Comprehensive event emission for transparency

### Proposal Types

#### 1. General Proposals
- Simple proposals without automatic execution
- Used for signaling, discussions, or non-binding votes

#### 2. Contract Call Proposals
- Execute arbitrary contract calls on behalf of the DAO
- Supports batched contract calls
- **Security Note**: Use with caution - validate all contract calls

#### 3. Parameter Change Proposals
- Modify DAO configuration parameters
- Currently supports extending parameters (can be customized)

#### 4. Member Management Proposals
- Add or remove DAO members through governance
- Maintains member registry and voting eligibility

## Usage

### Initialization

```rust
let config = DaoConfig {
    voting_token: voting_token_address,
    voting_period: 3600, // 1 hour in seconds
    execution_delay: 1800, // 30 minutes
    quorum_percentage: 50, // 50% quorum
    proposal_threshold: 100, // 100 tokens minimum to propose
    max_members: 100,
};

dao_client.initialize(&admin, &config);
```

### Member Management

```rust
// Add members (admin only)
dao_client.add_member(&new_member_address);

// Remove members (admin only)
dao_client.remove_member(&member_address);
```

### Creating Proposals

```rust
// General proposal
let proposal_id = dao_client.create_proposal(
    &proposer,
    &ProposalType::General,
    &title,
    &description,
    &Vec::new(&env), // contract_calls
    &Map::new(&env), // parameter_changes
    &Vec::new(&env), // new_members
    &Vec::new(&env), // remove_members
    &0, // execution_delay
);

// Contract call proposal
let contract_calls = Vec::from_array(&env, [ContractCall {
    contract_address: target_contract,
    function_name: Symbol::new(&env, "transfer"),
    args: Vec::from_array(&env, [recipient.into_val(&env), amount.into_val(&env)]),
}]);

let proposal_id = dao_client.create_proposal(
    &proposer,
    &ProposalType::ContractCall,
    &title,
    &description,
    &contract_calls,
    &Map::new(&env),
    &Vec::new(&env),
    &Vec::new(&env),
    &1800, // 30 minute execution delay
);
```

### Voting

```rust
// Cast vote
dao_client.vote(&voter, &proposal_id, &true); // true = in favor
```

### Execution

```rust
// Execute passed proposal (after voting period and any timelock)
dao_client.execute_proposal(&executor, &proposal_id);
```

## Configuration Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `voting_token` | ERC-20 token used for voting power | Token contract address |
| `voting_period` | Duration of voting period in seconds | 3600 (1 hour) |
| `execution_delay` | Delay before execution after voting ends | 1800 (30 minutes) |
| `quorum_percentage` | Minimum percentage of total votes needed | 50 (50%) |
| `proposal_threshold` | Minimum voting power to create proposals | 100 tokens |
| `max_members` | Maximum number of DAO members | 100 |

## Security Considerations

### Contract Call Proposals
- **High Risk**: Contract call proposals can execute arbitrary code
- **Recommendation**: Implement additional safety checks, multi-sig requirements, or timelocks for sensitive operations
- **Validation**: Always validate contract addresses and function calls before voting

### Voting Power
- **Centralization Risk**: If voting power is concentrated, governance can be captured
- **Recommendation**: Design token distribution to avoid excessive concentration

### Timelocks
- **Execution Delays**: Use execution delays for high-impact proposals
- **Emergency Actions**: Consider shorter delays for critical security updates

### Member Management
- **Sybil Attacks**: Prevent fake member additions through proper KYC or staking requirements
- **Removal Process**: Have clear processes for member removal to prevent lockouts

## Events

The contract emits the following events:

- `dao_initialized`: DAO setup with admin and voting token
- `member_added`: New member added to DAO
- `member_removed`: Member removed from DAO
- `proposal_created`: New proposal created
- `vote_cast`: Vote cast on proposal
- `proposal_executed`: Proposal successfully executed
- `proposal_cancelled`: Proposal cancelled

## Testing

Run tests with:
```bash
cargo test -p dao_governance
```

## Future Enhancements

- **Delegation**: Allow voting power delegation
- **Quadratic Voting**: Implement quadratic voting mechanisms
- **Proposal Templates**: Pre-defined proposal templates for common actions
- **Treasury Management**: Built-in treasury management features
- **Cross-Chain Governance**: Support for cross-chain proposal execution

## Integration

This DAO contract integrates with:
- **Upgradeable Framework**: For contract upgrades and administration
- **Token Contracts**: For voting power calculation
- **Any Soroban Contract**: Via contract call proposals

## License

This contract template is part of the CrowdPass Tokenbound implementation.