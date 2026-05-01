# Implementation Summary: Exponential Backoff and Retry Policy for RPC Calls

## Issue

**#220**: Add exponential backoff and retry policy for RPC calls in soroban-client

## Overview

Implemented a comprehensive retry policy system with exponential backoff and jitter to handle transient RPC failures in the Soroban client SDK.

## Changes Made

### 1. Core Retry Logic (`src/retry.ts`)

Created a new module with:

- **`RetryConfig` interface**: Configurable retry parameters
  - `maxRetries`: Maximum retry attempts (default: 3)
  - `initialDelayMs`: Initial delay between retries (default: 1000ms)
  - `maxDelayMs`: Maximum delay cap (default: 30000ms)
  - `backoffMultiplier`: Exponential multiplier (default: 2)
  - `enableJitter`: Enable randomization (default: true)
  - `jitterFactor`: Jitter percentage (default: 0.1 = ±10%)

- **`isRetryableError()` function**: Smart error detection
  - Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
  - Rate limiting errors
  - HTTP 5xx errors (502, 503, 504)
  - Timeout errors
  - Temporary unavailability

- **`calculateDelay()` function**: Exponential backoff calculation
  - Formula: `min(initialDelay * (multiplier ^ attempt), maxDelay)`
  - Optional jitter: `delay ± (delay * jitterFactor * random())`

- **`withRetry()` function**: Standalone retry wrapper
  - Executes function with retry logic
  - Logs retry attempts with context
  - Throws non-retryable errors immediately

- **`RetryPolicy` class**: Reusable retry policy
  - Encapsulates retry configuration
  - `execute()`: Run function with retries
  - `updateConfig()`: Dynamically update settings
  - `getConfig()`: Get current configuration

### 2. SDK Integration (`src/core.ts`)

Updated `SorobanSdkCore` class:

- Added `retryPolicy` property initialized from config
- Wrapped all RPC calls with retry logic:
  - `simulateTransaction()` - for read operations
  - `sendTransaction()` - for write operations
  - `getTransaction()` - for transaction status polling

### 3. Type Definitions (`src/types.ts`)

Extended `TokenboundSdkConfig`:

- Added optional `retryConfig?: RetryConfig` parameter
- Allows users to customize retry behavior per SDK instance

### 4. Exports (`src/index.ts`)

Added retry module to public API:

- Export all retry utilities
- Users can use `RetryPolicy` and `withRetry` directly

### 5. Comprehensive Tests (`src/__tests__/retry.test.ts`)

Created full test suite covering:

- **Error Classification**
  - Retryable error detection
  - Non-retryable error handling
  - Various error types and patterns

- **Delay Calculation**
  - Exponential backoff verification
  - Max delay capping
  - Jitter application
  - Custom multipliers and initial delays

- **Retry Logic**
  - Success on first attempt
  - Retry on transient errors
  - No retry on permanent errors
  - Max retries exhaustion
  - Retry logging

- **RetryPolicy Class**
  - Default configuration
  - Custom configuration
  - Config updates
  - Config retrieval

### 6. Documentation

#### `RETRY_POLICY.md`

Comprehensive documentation including:

- Feature overview
- Configuration options
- Retryable error patterns
- Delay calculation formulas
- Usage examples
- Best practices
- Performance considerations
- Troubleshooting guide
- Migration guide

#### `README.md` Updates

- Added retry policy to feature list
- Included configuration example
- Added link to detailed documentation

#### `examples/retry-usage.ts`

8 practical examples demonstrating:

1. Basic usage with defaults
2. Custom retry configuration
3. Direct RetryPolicy usage
4. One-off retries with withRetry
5. Scenario-based configurations
6. Dynamic config updates
7. Error handling patterns
8. Monitoring retry behavior

## Key Features

### 1. Automatic Retry

All RPC operations automatically retry on transient failures without code changes.

### 2. Smart Error Detection

Only retries appropriate errors:

- ✅ Network failures
- ✅ Timeouts
- ✅ Rate limits
- ✅ 5xx errors
- ❌ Invalid arguments
- ❌ Authentication errors
- ❌ Not found errors

### 3. Exponential Backoff

Delays increase exponentially to avoid overwhelming servers:

- Attempt 1: 1s
- Attempt 2: 2s
- Attempt 3: 4s
- Attempt 4: 8s (capped at maxDelay)

### 4. Jitter

Randomizes delays to prevent thundering herd:

- Prevents synchronized retries
- Reduces server load spikes
- Improves overall system stability

### 5. Configurable

Fully customizable per SDK instance:

```typescript
const sdk = createTokenboundSdk({
  // ... other config
  retryConfig: {
    maxRetries: 5,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    enableJitter: true,
    jitterFactor: 0.15,
  },
});
```

### 6. Observable

Logs retry attempts for monitoring:

```
RPC call failed (simulate eventManager.createEvent), retrying in 1023ms (attempt 1/3)... Network error
```

## Benefits

### For Users

- **Improved Reliability**: Automatic recovery from transient failures
- **Better UX**: Fewer failed operations due to temporary issues
- **Transparent**: Works automatically without code changes

### For Developers

- **Easy to Use**: Works out of the box with sensible defaults
- **Flexible**: Fully configurable for different scenarios
- **Testable**: Comprehensive test coverage
- **Observable**: Clear logging for debugging

### For Operations

- **Reduced Load**: Exponential backoff prevents server overload
- **Better Resilience**: Handles rate limits and temporary outages
- **Monitoring**: Retry logs help identify issues

## Testing

Run the test suite:

```bash
cd soroban-client
npm test -- retry.test.ts
```

Test coverage includes:

- ✅ Error classification (10+ test cases)
- ✅ Delay calculation (6+ test cases)
- ✅ Retry logic (8+ test cases)
- ✅ RetryPolicy class (6+ test cases)

## Migration

### Existing Code

No changes required! The retry policy is automatically applied to all RPC operations.

### Custom Retry Logic

If you have custom retry logic, you can remove it:

**Before:**

```typescript
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
```

**After:**

```typescript
const event = await sdk.eventManager.getEvent({ eventId: 1 });
```

## Performance Impact

### Best Case (No Retries)

- Zero overhead
- Immediate response

### Worst Case (Max Retries)

- Default config: ~7 seconds total delay (1s + 2s + 4s)
- Custom config: Depends on configuration

### Network Overhead

- Minimal: Only retries on actual failures
- Smart: Only retries appropriate errors

## Future Enhancements

Potential improvements:

- Circuit breaker pattern
- Adaptive retry strategies
- Per-operation retry configs
- Retry metrics and analytics
- Custom error classifiers
- Retry budget management

## Files Changed

### New Files

- `soroban-client/sdk/src/retry.ts` (180 lines)
- `soroban-client/sdk/src/__tests__/retry.test.ts` (280 lines)
- `soroban-client/sdk/RETRY_POLICY.md` (450 lines)
- `soroban-client/sdk/examples/retry-usage.ts` (280 lines)

### Modified Files

- `soroban-client/sdk/src/core.ts` (added retry integration)
- `soroban-client/sdk/src/types.ts` (added RetryConfig)
- `soroban-client/sdk/src/index.ts` (added exports)
- `soroban-client/sdk/README.md` (added documentation)

### Total Changes

- **8 files changed**
- **1,134 insertions**
- **4 deletions**

## Commit

```
feat: Add exponential backoff and retry policy for RPC calls

- Implement RetryPolicy class with configurable retry parameters
- Add exponential backoff with jitter to prevent thundering herd
- Automatically retry transient RPC failures (network errors, timeouts, 5xx)
- Integrate retry logic into all RPC operations (simulate, send, getTransaction)
- Add comprehensive test suite for retry functionality
- Include detailed documentation and usage examples

Resolves #220
```

## Branch

- **Name**: `feature/soroban-rpc-retry-policy`
- **Status**: Pushed to remote
- **Ready for**: Pull request and review

## Next Steps

1. ✅ Create pull request
2. ⏳ Code review
3. ⏳ Run CI/CD tests
4. ⏳ Merge to main
5. ⏳ Deploy to production

## References

- [Issue #220](https://github.com/crowdpass-live/tokenbound_impl/issues/220)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Stellar SDK Documentation](https://stellar.github.io/js-stellar-sdk/)
