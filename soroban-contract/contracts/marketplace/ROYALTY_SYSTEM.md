# Royalty Split System

## Overview

The royalty split system enables automatic distribution of sale proceeds to multiple recipients with configurable percentages. This is particularly useful for:

- **Event organizers** receiving a cut from secondary market sales
- **Artists/Creators** earning royalties on ticket resales
- **Platform fees** automatically collected on each transaction
- **Revenue sharing** among multiple stakeholders

## Key Features

✅ **Updatable Recipients**: Change royalty recipient addresses at any time  
✅ **Adjustable Percentages**: Modify payout percentages without redeploying  
✅ **Multiple Recipients**: Support up to 10 royalty recipients  
✅ **Basis Points Precision**: Percentages use basis points (1/10000) for accuracy  
✅ **Toggle On/Off**: Enable or disable royalty collection without removing config  
✅ **Automatic Distribution**: Royalties are distributed atomically during purchase

## Data Structures

### RoyaltyRecipient

```rust
pub struct RoyaltyRecipient {
    pub recipient: Address,      // Wallet address to receive royalties
    pub percentage: u32,         // Percentage in basis points (1/10000)
}
```

**Example:**

- 5% = 500 basis points
- 10% = 1000 basis points
- 100% = 10000 basis points

### RoyaltyConfig

```rust
pub struct RoyaltyConfig {
    pub recipients: Vec<RoyaltyRecipient>,  // List of recipients
    pub total_percentage: u32,              // Sum of all percentages
    pub active: bool,                       // Enable/disable flag
}
```

## Functions

### 1. `initialize_royalty_config`

Set up the initial royalty configuration. Can only be called once by admin.

**Parameters:**

- `admin`: Admin address (must be authorized)
- `recipients`: Vector of royalty recipients with percentages

**Constraints:**

- Total percentage must not exceed 10000 (100%)
- Maximum 10 recipients

**Example Usage:**

```rust
let mut recipients = Vec::new(&env);
recipients.push_back(RoyaltyRecipient {
    recipient: event_organizer,
    percentage: 500,  // 5%
});
recipients.push_back(RoyaltyRecipient {
    recipient: platform,
    percentage: 200,  // 2%
});

client.initialize_royalty_config(&admin, &recipients);
```

### 2. `update_royalty_config`

Replace the entire royalty configuration with a new one.

**Parameters:**

- `admin`: Admin address (must be authorized)
- `recipients`: New vector of royalty recipients

**Use Case:** Complete overhaul of royalty structure

### 3. `update_royalty_recipient`

Change a specific recipient's address without affecting percentages.

**Parameters:**

- `admin`: Admin address (must be authorized)
- `index`: Index of the recipient to update (0-based)
- `new_recipient`: New address to receive royalties

**Example:**

```rust
// Update recipient at index 0 to a new address
client.update_royalty_recipient(&admin, 0, &new_address);
```

### 4. `update_royalty_percentage`

Change a specific recipient's percentage without affecting other recipients.

**Parameters:**

- `admin`: Admin address (must be authorized)
- `index`: Index of the recipient to update (0-based)
- `new_percentage`: New percentage in basis points

**Example:**

```rust
// Change recipient at index 0 from 5% to 8%
client.update_royalty_percentage(&admin, 0, 800);
```

**Note:** Total percentage after update must not exceed 10000 (100%)

### 5. `toggle_royalty_config`

Enable or disable royalty collection without deleting the configuration.

**Parameters:**

- `admin`: Admin address (must be authorized)
- `active`: `true` to enable, `false` to disable

**Use Case:** Temporarily pause royalties during promotions or special events

### 6. `get_royalty_config`

View the current royalty configuration (public read-only function).

**Returns:** `Option<RoyaltyConfig>`

## Royalty Distribution Logic

When a ticket is purchased via `purchase_ticket()`:

1. **Check Configuration**: System checks if royalty config exists and is active
2. **Calculate Royalties**: For each recipient:
   ```
   royalty_amount = (sale_price × percentage) / 10000
   ```
3. **Distribute Payments**:
   - Transfer royalty amount to each recipient
   - Transfer remaining amount to seller
4. **Emit Events**: Log each royalty payment for transparency

### Example Calculation

**Sale Price:** 1000 XLM  
**Royalty Config:**

- Event Organizer: 5% (500 basis points)
- Platform: 2% (200 basis points)
- Artist: 3% (300 basis points)

**Distribution:**

- Event Organizer: 1000 × 500 / 10000 = **50 XLM**
- Platform: 1000 × 200 / 10000 = **20 XLM**
- Artist: 1000 × 300 / 10000 = **30 XLM**
- Seller receives: 1000 - 50 - 20 - 30 = **900 XLM**

## Events

### `royalty_config_initialized`

Emitted when royalty config is first created.

**Data:** `(total_percentage, recipient_count)`

### `royalty_config_updated`

Emitted when royalty config is completely replaced.

**Data:** `(total_percentage, recipient_count)`

### `royalty_recipient_updated`

Emitted when a recipient address is changed.

**Data:** `(index, new_recipient_address)`

### `royalty_percentage_updated`

Emitted when a recipient's percentage is changed.

**Data:** `(index, new_percentage, new_total_percentage)`

### `royalty_config_toggled`

Emitted when royalty config is enabled/disabled.

**Data:** `(active_status)`

### `royalty_paid`

Emitted for each royalty payment during a sale.

**Data:** `(listing_id, recipient_address, percentage, amount)`

## Error Handling

| Error Code | Name                        | Description                                |
| ---------- | --------------------------- | ------------------------------------------ |
| 10         | `InvalidRoyaltyPercentage`  | Total percentage exceeds 10000 or overflow |
| 11         | `RoyaltyConfigNotFound`     | Attempted to update non-existent config    |
| 12         | `RoyaltyRecipientsExceeded` | Number of recipients exceeds maximum (10)  |

## Security Considerations

1. **Admin-Only Functions**: All royalty management functions require admin authorization
2. **Percentage Validation**: Total percentage cannot exceed 100%
3. **Overflow Protection**: All calculations use checked arithmetic
4. **Atomic Distribution**: Royalties and seller payment happen in single transaction
5. **Configuration Immutability**: Seller and buyer can view royalty config before transaction

## Best Practices

### Setting Up Royalties

1. **Start Simple**: Begin with 1-2 recipients to test the system
2. **Clear Communication**: Inform all parties about royalty structure
3. **Reasonable Percentages**: Keep total royalties between 5-15% for market competitiveness
4. **Regular Audits**: Use `get_royalty_config()` to verify configuration

### Updating Recipients

1. **Coordinate Changes**: Notify recipients before updating addresses
2. **Test with Small Amounts**: Verify new addresses with small transactions first
3. **Document Changes**: Keep off-chain records of when and why changes were made

### Percentage Adjustments

1. **Maintain Transparency**: Announce percentage changes to stakeholders
2. **Stay Under 100%**: Always leave sufficient amount for the seller
3. **Consider Market Impact**: High royalties may discourage secondary market activity

## Integration Example

### Frontend Integration

```typescript
// Get current royalty config
const royaltyConfig = await marketplaceContract.getRoyaltyConfig();

if (royaltyConfig && royaltyConfig.active) {
  console.log(`Total royalties: ${royaltyConfig.total_percentage / 100}%`);

  royaltyConfig.recipients.forEach((recipient, index) => {
    console.log(`Recipient ${index}: ${recipient.address}`);
    console.log(`  Percentage: ${recipient.percentage / 100}%`);
  });
}

// Calculate expected royalty for a listing
function calculateRoyalties(price: number, config: RoyaltyConfig) {
  return config.recipients.map((recipient) => ({
    address: recipient.address,
    amount: (price * recipient.percentage) / 10000,
    percentage: recipient.percentage / 100,
  }));
}
```

## Testing

Run the royalty tests:

```bash
cd soroban-contract/contracts/marketplace
cargo test test_royalty
```

## Future Enhancements

- [ ] Per-event royalty configurations
- [ ] Tiered royalty rates based on sale price
- [ ] Time-based royalty adjustments
- [ ] Royalty recipient voting mechanism
- [ ] Automatic royalty compounding for treasury
