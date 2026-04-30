# Feature Flagging Contract for Soroban

This contract provides a system for managing feature flags in Soroban-based applications. It allows administrators to enable or disable features dynamically, supporting controlled rollouts, A/B testing, and feature management.

## Overview

Feature flags are a software development technique that enables teams to:

- **Controlled Rollouts**: Deploy features to a subset of users
- **A/B Testing**: Test different versions of features with different user groups
- **Kill Switches**: Quickly disable problematic features without redeploying
- **Gradual Migration**: Safely transition between different implementations

## Core Features

### Global Feature Flags

Global features that apply across the entire system:

```rust
// Create a feature
create_feature("new_marketplace", "New marketplace UI", true)

// Check if enabled
is_enabled("new_marketplace")

// Toggle feature
enable_feature("new_marketplace")
disable_feature("new_marketplace")
```

### Event-Scoped Features

Features can be enabled/disabled for specific events:

```rust
// Set feature for a specific event
set_event_feature(event_id, "VIP_tier", true)

// Check if feature is enabled for event
is_event_feature_enabled(event_id, "VIP_tier")
```

## Key Methods

### Initialization

```rust
pub fn __constructor(env: Env, admin: Address)
```

Initialize the contract with an admin address. The admin can manage all features.

### Feature Management

#### `create_feature`
Creates a new feature flag.

**Parameters:**
- `name: String` - Unique feature name
- `description: String` - Feature description
- `enabled: bool` - Initial state

**Errors:**
- `InvalidFeatureName` - Empty feature name
- `FeatureNotFound` - Feature already exists

#### `enable_feature`
Enable a feature.

**Parameters:**
- `name: String` - Feature name

#### `disable_feature`
Disable a feature.

**Parameters:**
- `name: String` - Feature name

#### `is_enabled`
Check if a feature is enabled.

**Returns:** `bool` - Feature status

### Feature Queries

#### `get_feature`
Get detailed information about a feature.

**Returns:** `FeatureStatus` - Full feature details

#### `list_features`
Get all feature names.

**Returns:** `Vec<String>` - List of feature names

#### `get_all_features`
Get all features with details.

**Returns:** `Vec<FeatureStatus>` - All features

### Event-Scoped Operations

#### `set_event_feature`
Set feature status for a specific event.

**Parameters:**
- `event_id: u32` - Event ID
- `feature_name: String` - Feature name
- `enabled: bool` - Feature state

#### `is_event_feature_enabled`
Check if a feature is enabled for an event.

**Parameters:**
- `event_id: u32` - Event ID
- `feature_name: String` - Feature name

**Returns:** `bool` - Feature status (falls back to global if not found)

## Data Structures

### FeatureStatus

```rust
pub struct FeatureStatus {
    pub name: String,                  // Feature name
    pub enabled: bool,                 // Is feature enabled
    pub created_at: u64,              // Creation timestamp
    pub updated_at: u64,              // Last update timestamp
    pub description: String,           // Feature description
}
```

## Events

### FeatureCreatedEvent
Emitted when a feature is created.

### FeatureToggleEvent
Emitted when a feature is enabled or disabled.

## Error Codes

- `NotInitialized` (1): Contract not initialized
- `Unauthorized` (2): Caller is not the admin
- `FeatureNotFound` (3): Requested feature does not exist
- `AlreadyInitialized` (4): Contract already initialized
- `InvalidFeatureName` (5): Feature name is invalid (empty)
- `EventIdNotFound` (6): Event configuration not found

## Usage Example

### Creating and Managing Features

```rust
// Initialize contract
let admin = Address::from_contract_id(&env, &admin_id);
FeatureFlagging::__constructor(env.clone(), admin.clone());

// Create a new feature
FeatureFlagging::create_feature(
    env.clone(),
    String::from_str(&env, "new_vip_system"),
    String::from_str(&env, "New VIP tier system"),
    false, // Start disabled
)?;

// Enable the feature after testing
FeatureFlagging::enable_feature(env.clone(), String::from_str(&env, "new_vip_system"))?;

// Check if feature is enabled
let is_enabled = FeatureFlagging::is_enabled(
    env.clone(),
    String::from_str(&env, "new_vip_system")
)?;

// Enable feature for specific event
FeatureFlagging::set_event_feature(
    env.clone(),
    123, // event_id
    String::from_str(&env, "early_access"),
    true,
)?;
```

### Integration with Other Contracts

```rust
use feature_flagging::{FeatureFlagging, Error};

// Check if feature is enabled before executing logic
FeatureFlagging::require_feature_enabled(
    env.clone(),
    String::from_str(&env, "new_marketplace")
)?;

// Perform feature-specific logic
// ...
```

## Storage Optimization

The contract uses Soroban's storage types efficiently:

- **Instance Storage**: Admin address and feature list (frequently accessed)
- **Persistent Storage**: Individual feature statuses and event configs (less frequent access)

## Security Considerations

1. **Admin Verification**: All state-changing operations require admin authorization
2. **Immutable Creation**: Feature names cannot be modified after creation
3. **Atomic Updates**: Feature toggles are atomic operations
4. **Event Logging**: All changes are logged as events for auditability

## Future Enhancements

- **Rollout Percentages**: Define percentage of users who get the feature
- **Time-based Activation**: Schedule features for specific times
- **User Segmentation**: Enable features for specific user groups
- **Feature Dependencies**: Define features that depend on others
- **Metrics Integration**: Track feature usage and impact

## Integration Points

This contract can be integrated with:

- **event_manager**: Enable/disable features per event
- **marketplace**: Feature gates for new marketplace features
- **ticket_nft**: NFT-specific features
- **tba_account**: TBA-specific features
