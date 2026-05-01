# Retry Policy for Soroban RPC Calls

This document describes the exponential backoff and retry policy implementation for handling transient RPC failures in the Soroban client SDK.

## Overview

The retry policy automatically retries failed RPC calls with exponential backoff and jitter to handle transient network failures, rate limiting, and temporary service unavailability.

## Features

- **Exponential Backoff**: Delays between retries increase exponentially to avoid overwhelming the server
- **Jitter**: Randomizes delays to prevent thundering herd problems
- **Configurable**: All retry parameters can be customized
- **Smart Error Detection**: Only retries transient errors, not permanent failures
- **Automatic Integration**: Applied to all RPC operations (simulate, send, getTransaction)

## Configuration

### Default Configuration

```typescript
{
  maxRetries: 3,              // Maximum number of retry attempts
  initialDelayMs: 1000,       // Initial delay (1 second)
  maxDelayMs: 30000,          // Maximum delay (30 seconds)
  backoffMultiplier: 2,       // Exponential multiplier
  enableJitter: true,         // Enable jitter
  jitterFactor: 0.1           // ±10% randomization
}
```

### Custom Configuration

You can customize the retry policy when creating the SDK:

```typescript
import { createTokenboundSdk } from "@crowdpass/tokenbound-sdk";

const sdk = createTokenboundSdk({
  horizonUrl: "https://horizon-testnet.stellar.org",
  sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  contracts: {
    eventManager: "CXXX...",
    // ... other contracts
  },
  retryConfig: {
    maxRetries: 5, // Retry up to 5 times
    initialDelayMs: 2000, // Start with 2 second delay
    maxDelayMs: 60000, // Cap at 60 seconds
    backoffMultiplier: 2, // Double delay each time
    enableJitter: true, // Add randomization
    jitterFactor: 0.15, // ±15% randomization
  },
});
```

## Retryable Errors

The following error patterns trigger automatic retries:

### Network Errors

- `ECONNREFUSED` - Connection refused
- `ENOTFOUND` - DNS lookup failed
- `ETIMEDOUT` - Connection timeout
- `ECONNRESET` - Connection reset
- `socket hang up` - Socket disconnected

### Rate Limiting

- `rate limit` - Rate limit exceeded
- `too many requests` - Too many requests

### HTTP Errors

- `502` - Bad Gateway
- `503` - Service Unavailable
- `504` - Gateway Timeout

### General

- `network` - Generic network errors
- `timeout` - Timeout errors
- `temporarily unavailable` - Temporary unavailability

## Delay Calculation

The delay between retries is calculated using exponential backoff:

```
delay = min(initialDelay * (multiplier ^ attempt), maxDelay)
```

With jitter enabled:

```
jitter = random(-jitterFactor, +jitterFactor) * delay
finalDelay = delay + jitter
```

### Example Delays (Default Config)

| Attempt | Base Delay | With Jitter (±10%) |
| ------- | ---------- | ------------------ |
| 1       | 1000ms     | 900-1100ms         |
| 2       | 2000ms     | 1800-2200ms        |
| 3       | 4000ms     | 3600-4400ms        |
| 4       | 8000ms     | 7200-8800ms        |

## Usage Examples

### Basic Usage (Automatic)

The retry policy is automatically applied to all RPC operations:

```typescript
// Automatically retries on transient failures
const event = await sdk.eventManager.getEvent({ eventId: 1 });

// Automatically retries transaction submission
const result = await sdk.eventManager.createEvent(
  {
    organizer: "GXXX...",
    theme: "Web3 Conference",
    // ... other params
  },
  {
    source: "GXXX...",
    signTransaction: async (xdr, opts) => {
      // Sign transaction
      return signedXdr;
    },
  },
);
```

### Using RetryPolicy Directly

You can also use the retry policy for custom operations:

```typescript
import { RetryPolicy } from "@crowdpass/tokenbound-sdk";

const retryPolicy = new RetryPolicy({
  maxRetries: 3,
  initialDelayMs: 1000,
});

// Retry a custom operation
const result = await retryPolicy.execute(
  async () => {
    // Your RPC call here
    return await someRpcCall();
  },
  "custom operation", // Optional context for logging
);
```

### Using withRetry Helper

For one-off retries without creating a policy instance:

```typescript
import { withRetry } from "@crowdpass/tokenbound-sdk";

const result = await withRetry(
  async () => {
    return await someRpcCall();
  },
  {
    maxRetries: 2,
    initialDelayMs: 500,
  },
  "one-off operation",
);
```

## Monitoring and Logging

The retry policy logs warnings when retrying operations:

```
RPC call failed (simulate eventManager.createEvent), retrying in 1023ms (attempt 1/3)... Network error
```

This helps with:

- Debugging transient issues
- Monitoring RPC reliability
- Identifying patterns in failures

## Best Practices

### 1. Use Appropriate Max Retries

```typescript
// For critical operations
retryConfig: {
  maxRetries: 5; // More retries for important operations
}

// For non-critical operations
retryConfig: {
  maxRetries: 2; // Fewer retries to fail fast
}
```

### 2. Adjust Delays Based on Use Case

```typescript
// For user-facing operations (faster feedback)
retryConfig: {
  initialDelayMs: 500,
  maxDelayMs: 5000
}

// For background operations (more patient)
retryConfig: {
  initialDelayMs: 2000,
  maxDelayMs: 60000
}
```

### 3. Enable Jitter in Production

```typescript
retryConfig: {
  enableJitter: true,  // Prevents thundering herd
  jitterFactor: 0.1    // 10% randomization
}
```

### 4. Monitor Retry Patterns

Watch for frequent retries which may indicate:

- RPC endpoint issues
- Network problems
- Rate limiting
- Need to adjust retry configuration

## Error Handling

Non-retryable errors are thrown immediately without retries:

```typescript
try {
  await sdk.eventManager.createEvent(params, options);
} catch (error) {
  // Could be:
  // 1. Non-retryable error (thrown immediately)
  // 2. Retryable error after max retries exhausted
  console.error("Operation failed:", error);
}
```

## Testing

The retry policy includes comprehensive tests:

```bash
cd soroban-client/sdk
npm test -- retry.test.ts
```

Test coverage includes:

- Error classification
- Delay calculation
- Exponential backoff
- Jitter application
- Retry logic
- Configuration management

## Performance Considerations

### Network Overhead

With default config (3 retries):

- Best case: No retries, immediate response
- Worst case: ~7 seconds total delay (1s + 2s + 4s)

### Timeout Interaction

The retry policy works alongside transaction timeouts:

- Transaction timeout: 30 seconds (default)
- Retry delays: Separate from transaction timeout
- Total time: Transaction timeout + retry delays

### Rate Limiting

Exponential backoff helps avoid rate limits:

- Increasing delays give server time to recover
- Jitter prevents synchronized retries
- Reduces likelihood of hitting rate limits

## Migration Guide

### Existing Code

No changes required! The retry policy is automatically applied to all RPC operations.

### Custom Retry Logic

If you have custom retry logic, you can remove it:

```typescript
// Before (custom retry logic)
async function callWithRetry() {
  for (let i = 0; i < 3; i++) {
    try {
      return await sdk.eventManager.getEvent({ eventId: 1 });
    } catch (error) {
      if (i === 2) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}

// After (automatic retry)
const event = await sdk.eventManager.getEvent({ eventId: 1 });
```

## Troubleshooting

### Too Many Retries

If operations are retrying too often:

```typescript
// Reduce max retries
retryConfig: {
  maxRetries: 2;
}
```

### Retries Too Slow

If retries are taking too long:

```typescript
// Reduce delays
retryConfig: {
  initialDelayMs: 500,
  maxDelayMs: 5000
}
```

### Non-Retryable Errors Being Retried

If you encounter errors that shouldn't be retried, please open an issue with:

- Error message
- Error type
- Context of the operation

## Future Enhancements

Potential improvements:

- Circuit breaker pattern
- Adaptive retry strategies
- Per-operation retry configs
- Retry metrics and analytics
- Custom error classifiers

## References

- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
- [Soroban RPC Documentation](https://soroban.stellar.org/docs/reference/rpc)
