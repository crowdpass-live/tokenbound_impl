# Gas Estimation for Soroban Operations

This SDK provides comprehensive gas estimation capabilities, allowing users to preview transaction costs before executing complex contract operations.

## Features

- **Accurate Simulation**: Uses Soroban RPC simulation to get precise resource measurements
- **Cost Breakdown**: Detailed breakdown of base fees, resource fees, and refundable portions
- **Resource Metrics**: CPU instructions, read/write bytes, and storage operations
- **Safety Buffer**: Configurable fee buffer multiplier to ensure transactions succeed
- **Offline Estimation**: Rough estimates for air-gapped or hardware wallet flows
- **Formatted Display**: Human-readable gas reports for UI display

## Quick Start

### Basic Gas Estimation

```typescript
import { createTokenboundSdk } from '@crowdpass/tokenbound-sdk';

const sdk = createTokenboundSdk({
  horizonUrl: 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  simulationSource: 'GABC...', // Default source for simulations
});

// Estimate gas for a contract call
const gas = await sdk.estimateGas('eventManager', {
  contractId: 'CDP...',
  method: 'create_event',
  args: [/* ... */]
}, {
  source: 'GABC...', // Optional: override simulation source
  feeBufferMultiplier: 1.3, // 30% buffer for safety
});

console.log(gas.summary);
// "Estimated gas: 0.0001234 XLM (max: 0.0001481 XLM). Resources: 50000 instructions, 1024 bytes I/O."
```

### Formatted Display

```typescript
import { formatGasDisplay } from '@crowdpass/tokenbound-sdk';

// Print detailed gas report
console.log(formatGasDisplay(gas, {
  currency: 'XLM',
  decimals: 7,
  showResources: true,
  showCosts: true,
}));

// Output:
// ═══════════════════════════════════════════
//           GAS ESTIMATION REPORT
// ═══════════════════════════════════════════
//
// 💰 ESTIMATED COSTS
// ───────────────────────────────────────────
//   Base Fee:       0.0000100 XLM
//   Resource Fee:   0.0001134 XLM
//   Refundable:     0.0000100 XLM
//   ─────────────────────────────────────────
//   TOTAL:          0.0001234 XLM
//   Max (buffered): 0.0001481 XLM
//
// ⚡ RESOURCE USAGE
// ───────────────────────────────────────────
//   Instructions:   50,000
//   Read Bytes:     1,024
//   Write Bytes:    512
//   ...
//
// ═══════════════════════════════════════════
// Estimated gas: 0.0001234 XLM (max: 0.0001481 XLM). Resources: 50000 instructions, 1024 bytes I/O.
// ═══════════════════════════════════════════
```

## API Reference

### `sdk.estimateGas(contract, artifact, options)`

Estimates gas costs by simulating a transaction against the actual contract state.

**Parameters:**
- `contract`: Contract name ('eventManager', 'ticketNft', etc.)
- `artifact`: Contract call details including contractId, method, and args
- `options`: Gas estimation options
  - `source`: Source account for simulation
  - `fee`: Base fee override (in stroops)
  - `feeBufferMultiplier`: Safety buffer multiplier (default: 1.2)
  - `includeRawSimulation`: Include raw RPC response (default: false)
  - `correlationId`: Tracing correlation ID

**Returns:** `GasEstimation` object with:
- `costs`: Detailed cost breakdown
  - `baseFee`: Base transaction fee
  - `resourceFee`: Fee for resource consumption
  - `refundableFee`: Portion refunded on success
  - `totalFee`: Total estimated fee
  - `maxFee`: Maximum fee with buffer applied
- `resources`: Resource usage metrics
  - `instructions`: CPU instructions executed
  - `readBytes`: Bytes read from storage
  - `writeBytes`: Bytes written to storage
  - `entryReads`: Contract entries read
  - `entryWrites`: Contract entries written
  - `transactionSizeBytes`: Transaction XDR size
  - `metadataSizeBytes`: Soroban metadata size
- `success`: Whether simulation succeeded
- `summary`: Human-readable summary string
- `rawSimulation`: Raw RPC response (if requested)

### `formatGasDisplay(estimation, options)`

Formats a gas estimation into a multi-line human-readable report.

```typescript
import { formatGasDisplay } from '@crowdpass/tokenbound-sdk';

const report = formatGasDisplay(gas, {
  currency: 'XLM',      // 'XLM' or 'stroops'
  decimals: 7,          // Decimal places for XLM
  showResources: true,  // Include resource breakdown
  showCosts: true,      // Include cost breakdown
});
```

### `formatGasCost(stroops, currency, decimals)`

Formats a single gas cost value.

```typescript
import { formatGasCost } from '@crowdpass/tokenbound-sdk';

formatGasCost(1234000, 'XLM', 7);  // "0.1234000 XLM"
formatGasCost(1234000, 'stroops'); // "1,234,000 stroops"
```

### `calculateRecommendedFee(gasEstimation, priority)`

Calculates a recommended fee based on priority level.

```typescript
import { calculateRecommendedFee } from '@crowdpass/tokenbound-sdk';

const recommendedFee = calculateRecommendedFee(gas, 'high');
// Returns fee with 1.5x multiplier for high priority
```

### `checkResourceWarnings(estimation)`

Checks for potentially problematic resource usage.

```typescript
import { checkResourceWarnings } from '@crowdpass/tokenbound-sdk';

const { hasWarnings, warnings } = checkResourceWarnings(gas);
if (hasWarnings) {
  console.warn('Resource concerns:', warnings);
  // ["High instruction count (150,000,000). May exceed network limits."]
}
```

### `compareGasEstimations(before, after)`

Compares two gas estimations to show the impact of changes.

```typescript
import { compareGasEstimations } from '@crowdpass/tokenbound-sdk';

const comparison = compareGasEstimations(oldGas, newGas);
console.log(comparison.summary);
// "Gas cost increase: 0.0000500 XLM (500000 stroops)"
```

## Offline Gas Estimation

For air-gapped or hardware wallet flows where network access isn't available:

```typescript
import { OfflineTransactionBuilder } from '@crowdpass/tokenbound-sdk';

const builder = new OfflineTransactionBuilder('Test SDF Network ; September 2015');

const account = {
  accountId: 'GABC...',
  sequenceNumber: '123456789',
};

const artifact = {
  contractId: 'CDP...',
  method: 'create_event',
  args: [/* ... */],
};

// Rough estimate without network
const estimate = builder.estimateGasOffline(account, artifact, 100, 1.2);

console.log(estimate.summary);
// "Estimated gas: 0.0000150 XLM (max: 0.0000180 XLM). Tx size: 450 bytes."
```

**Note:** Offline estimates are less accurate than online simulation as they cannot account for current contract state or resource contention.

## Integration with Contract Calls

### Estimate Before Write

```typescript
// First, estimate the gas
const gas = await sdk.estimateGas('eventManager', artifact, {
  source: organizerAddress,
});

// Check if user can afford it
if (gas.costs.maxFee > userBalance) {
  throw new Error(`Insufficient balance. Need ${formatGasCost(gas.costs.maxFee)}`);
}

// Show confirmation with gas estimate
if (confirm(`This will cost approximately ${gas.summary}. Proceed?`)) {
  // Execute the actual transaction
  const result = await sdk.write('eventManager', artifact, {
    source: organizerAddress,
    signTransaction: wallet.sign,
  });
}
```

### Batch Operations

```typescript
const operations = [artifact1, artifact2, artifact3];

// Estimate all operations
const estimates = await Promise.all(
  operations.map(op => sdk.estimateGas('eventManager', op, { source }))
);

// Calculate total cost
const totalMaxFee = estimates.reduce((sum, e) => sum + e.costs.maxFee, 0);

console.log(`Total estimated cost for ${operations.length} operations:`);
console.log(`  Max: ${formatGasCost(totalMaxFee)}`);
```

## Best Practices

1. **Always Use Buffer**: Set `feeBufferMultiplier` to at least 1.2 (20%) to handle network congestion
2. **Check Success**: Verify `gas.success` before proceeding with actual transactions
3. **Handle Failures**: If simulation fails, the error is in `gas.summary`
4. **Cache Estimates**: Gas estimates can be cached for similar operations within a short time window
5. **Offline Fallback**: Use `estimateGasOffline` for hardware wallet flows where online simulation isn't possible

## Troubleshooting

### "Simulation failed" errors
- Check that the contract ID is correct
- Verify the method name and arguments match the contract spec
- Ensure the source account exists on the network

### High gas costs
- Large argument values increase transaction size
- Complex operations with many storage reads/writes cost more
- Consider batching multiple operations into a single transaction

### Fee buffer exceeded
- Network congestion can cause actual fees to exceed estimates
- Increase `feeBufferMultiplier` during high-traffic periods
- Monitor recent ledger fees to set appropriate buffers

## TypeScript Types

```typescript
interface GasEstimation {
  costs: {
    baseFee: number;           // stroops
    resourceFee: number;       // stroops
    refundableFee: number;     // stroops
    totalFee: number;          // stroops
    maxFee: number;            // stroops
  };
  resources: {
    instructions: number;
    readBytes: number;
    writeBytes: number;
    entryReads: number;
    entryWrites: number;
    transactionSizeBytes: number;
    metadataSizeBytes: number;
  };
  success: boolean;
  summary: string;
  rawSimulation?: unknown;
}

interface GasEstimateOptions extends InvokeOptions {
  includeRawSimulation?: boolean;
  feeBufferMultiplier?: number;
}
```

---

For more information on Soroban fees, see the [Stellar Documentation](https://soroban.stellar.org/docs/fundamentals/fees-and-metering).
