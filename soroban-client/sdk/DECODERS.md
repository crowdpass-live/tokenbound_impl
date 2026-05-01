# Typed Decoder Utilities for Soroban Contract Responses

This document describes the typed decoder utilities for safely parsing Soroban contract return values in TypeScript.

## Overview

The decoder utilities provide a type-safe way to parse and validate contract responses from Soroban smart contracts. Instead of relying on unsafe type assertions, decoders explicitly validate data structure and types, catching errors early and providing clear error messages.

## Features

- **Type Safety**: Explicit type validation with TypeScript support
- **Composable**: Build complex decoders from simple ones
- **Error Handling**: Clear error messages with context
- **Soroban Types**: Built-in support for Soroban-specific types (u32, u64, u128, i128, etc.)
- **Contract Decoders**: Pre-built decoders for common contract structures
- **Safe Decoding**: Optional safe decoding that returns results instead of throwing

## Installation

The decoders are included in the SDK:

```typescript
import {
  decodeString,
  decodeNumber,
  decodeArray,
  ContractDecoder,
  // ... other decoders
} from "@crowdpass/tokenbound-sdk";
```

## Basic Usage

### Primitive Types

```typescript
import {
  decodeString,
  decodeNumber,
  decodeBigInt,
  decodeBoolean,
} from "@crowdpass/tokenbound-sdk";

// Decode primitives
const name = decodeString("Alice"); // "Alice"
const age = decodeNumber(25); // 25
const balance = decodeBigInt("1000000000"); // 1000000000n
const active = decodeBoolean(true); // true
```

### Arrays

```typescript
import {
  decodeArray,
  decodeNumber,
  decodeString,
} from "@crowdpass/tokenbound-sdk";

// Decode array of numbers
const numbers = decodeArray(decodeNumber)([1, 2, 3, 4, 5]);
// [1, 2, 3, 4, 5]

// Decode array of strings
const names = decodeArray(decodeString)(["Alice", "Bob", "Charlie"]);
// ["Alice", "Bob", "Charlie"]
```

### Optional Values

```typescript
import { decodeOption, decodeNumber } from "@crowdpass/tokenbound-sdk";

// Decode optional number
const maybeNumber = decodeOption(decodeNumber);

maybeNumber(null); // null
maybeNumber(undefined); // null
maybeNumber({ Some: 42 }); // 42 (Soroban Option format)
maybeNumber(42); // 42 (direct value)
```

### Structs/Objects

```typescript
import {
  decodeStruct,
  decodeNumber,
  decodeString,
  decodeBoolean,
} from "@crowdpass/tokenbound-sdk";

// Define a struct decoder
const decodeUser = decodeStruct({
  id: decodeNumber,
  name: decodeString,
  email: decodeString,
  active: decodeBoolean,
});

// Use it
const user = decodeUser({
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  active: true,
});
// { id: 1, name: "Alice", email: "alice@example.com", active: true }
```

### Tuples

```typescript
import {
  decodeTuple,
  decodeNumber,
  decodeString,
  decodeBoolean,
} from "@crowdpass/tokenbound-sdk";

// Decode tuple with mixed types
const decodeMixedTuple = decodeTuple(decodeNumber, decodeString, decodeBoolean);

const result = decodeMixedTuple([42, "hello", true]);
// [42, "hello", true]
```

## Soroban-Specific Types

### Unsigned Integers

```typescript
import { decodeU32, decodeU64, decodeU128 } from "@crowdpass/tokenbound-sdk";

// u32: 0 to 4,294,967,295
const eventId = decodeU32(123);

// u64: 0 to 2^64-1
const timestamp = decodeU64(1234567890);

// u128: 0 to 2^128-1 (as bigint)
const totalSupply = decodeU128(1000000000000n);
```

### Signed Integers

```typescript
import { decodeI32, decodeI64, decodeI128 } from "@crowdpass/tokenbound-sdk";

// i32: -2,147,483,648 to 2,147,483,647
const temperature = decodeI32(-15);

// i64: -2^63 to 2^63-1
const balance = decodeI64(-1000);

// i128: -2^127 to 2^127-1 (as bigint)
const price = decodeI128(-5000000000n);
```

### Addresses

```typescript
import { decodeAddress } from "@crowdpass/tokenbound-sdk";

// Stellar address (G... or C...)
const organizer = decodeAddress(
  "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
);
const contract = decodeAddress(
  "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
);
```

### Bytes

```typescript
import { decodeBytes, decodeBytesN } from "@crowdpass/tokenbound-sdk";

// Variable-length bytes
const data = decodeBytes("0x010203");
// Uint8Array([1, 2, 3])

// Fixed-length bytes (e.g., BytesN<32>)
const hash = decodeBytesN(32)("0x" + "00".repeat(32));
// Uint8Array of length 32
```

## Contract-Specific Decoders

### Event Decoder

```typescript
import { ContractDecoder } from "@crowdpass/tokenbound-sdk";

const decodeEvent = ContractDecoder.event();

const event = decodeEvent({
  id: 1,
  theme: "Web3 Conference",
  organizer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  event_type: "Conference",
  total_tickets: 100n,
  tickets_sold: 50n,
  ticket_price: 1000000000n,
  start_date: 1234567890,
  end_date: 1234567900,
  is_canceled: false,
  ticket_nft_addr: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  payment_token: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
});
```

### Ticket Tier Decoder

```typescript
import { ContractDecoder } from "@crowdpass/tokenbound-sdk";

const decodeTier = ContractDecoder.ticketTier();

const tier = decodeTier({
  name: "VIP",
  price: 5000000000n,
  total_quantity: 50n,
  sold_quantity: 25n,
});
```

### Buyer Purchase Decoder

```typescript
import { ContractDecoder } from "@crowdpass/tokenbound-sdk";

const decodePurchase = ContractDecoder.buyerPurchase();

const purchase = decodePurchase({
  quantity: 2n,
  total_paid: 2000000000n,
});
```

### TBA Token Decoder

```typescript
import { ContractDecoder } from "@crowdpass/tokenbound-sdk";

const decodeToken = ContractDecoder.tbaToken();

const token = decodeToken([
  1, // chain_id
  "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // token_contract
  123n, // token_id
]);
// [1, "CXXX...", 123n]
```

## Advanced Usage

### Composing Decoders

```typescript
import {
  decodeStruct,
  decodeArray,
  decodeOption,
  decodeU32,
  decodeString,
  decodeI128,
} from "@crowdpass/tokenbound-sdk";

// Decode complex nested structure
const decodeEventWithTiers = decodeStruct({
  id: decodeU32,
  name: decodeString,
  tiers: decodeArray(
    decodeStruct({
      name: decodeString,
      price: decodeI128,
      available: decodeOption(decodeU32),
    }),
  ),
});

const event = decodeEventWithTiers({
  id: 1,
  name: "Conference",
  tiers: [
    { name: "General", price: 1000000000n, available: 100 },
    { name: "VIP", price: 5000000000n, available: null },
  ],
});
```

### Transform Decoded Values

```typescript
import { decodeTransform, decodeString } from "@crowdpass/tokenbound-sdk";

// Decode and transform to uppercase
const decodeUppercase = decodeTransform(decodeString, (s) => s.toUpperCase());

const result = decodeUppercase("hello");
// "HELLO"

// Decode number and multiply
const decodeDouble = decodeTransform(decodeNumber, (n) => n * 2);

const doubled = decodeDouble(21);
// 42
```

### Validate Decoded Values

```typescript
import { decodeValidate, decodeNumber } from "@crowdpass/tokenbound-sdk";

// Decode and validate positive number
const decodePositive = decodeValidate(
  decodeNumber,
  (n) => n > 0,
  "Must be positive",
);

decodePositive(5); // 5
decodePositive(-5); // throws DecoderError: Must be positive
```

### Decode with Default Value

```typescript
import { decodeWithDefault, decodeNumber } from "@crowdpass/tokenbound-sdk";

// Decode with fallback
const decodeWithZero = decodeWithDefault(decodeNumber, 0);

decodeWithZero(42); // 42
decodeWithZero("invalid"); // 0 (fallback)
```

### Decode One of Multiple Types

```typescript
import {
  decodeOneOf,
  decodeNumber,
  decodeString,
} from "@crowdpass/tokenbound-sdk";

// Try number first, then string
const decodeNumberOrString = decodeOneOf(decodeNumber, decodeString);

decodeNumberOrString(42); // 42
decodeNumberOrString("hello"); // "hello"
```

### Decode Enum Values

```typescript
import { decodeEnum } from "@crowdpass/tokenbound-sdk";

// Define enum decoder
const decodeEventType = decodeEnum(
  ["Conference", "Concert", "Workshop", "Meetup"] as const,
  "EventType",
);

decodeEventType("Conference"); // "Conference"
decodeEventType("Invalid"); // throws DecoderError
```

### Decode Literal Values

```typescript
import { decodeLiteral } from "@crowdpass/tokenbound-sdk";

// Decode exact value
const decodeSuccess = decodeLiteral("success");

decodeSuccess("success"); // "success"
decodeSuccess("failure"); // throws DecoderError
```

## Safe Decoding

Instead of throwing errors, you can use safe decoding that returns a result:

```typescript
import { safeDecode, decodeNumber } from "@crowdpass/tokenbound-sdk";

// Safe decode returns result object
const result = safeDecode(decodeNumber, "invalid");

if (result.success) {
  console.log("Value:", result.value);
} else {
  console.error("Error:", result.error.message);
}
```

## Error Handling

### DecoderError

All decoder errors are instances of `DecoderError`:

```typescript
import { DecoderError, decodeNumber } from "@crowdpass/tokenbound-sdk";

try {
  decodeNumber("not a number");
} catch (error) {
  if (error instanceof DecoderError) {
    console.log("Message:", error.message);
    console.log("Value:", error.value);
    console.log("Expected:", error.expectedType);
  }
}
```

### Error Context

Add context to decoder errors:

```typescript
import { withContext, decodeNumber } from "@crowdpass/tokenbound-sdk";

const decodeEventId = withContext(decodeNumber, "event ID");

try {
  decodeEventId("invalid");
} catch (error) {
  // Error: event ID: Expected number, got string
}
```

### Contract Response Decoding

Decode contract responses with automatic error handling:

```typescript
import {
  decodeContractResponse,
  ContractDecoder,
} from "@crowdpass/tokenbound-sdk";

const response = await contract.getEvent(1);

const event = decodeContractResponse(
  ContractDecoder.event(),
  response,
  "getEvent",
);
```

## Integration with SDK

### Using Decoders in Contract Methods

```typescript
import {
  createTokenboundSdk,
  ContractDecoder,
} from "@crowdpass/tokenbound-sdk";

const sdk = createTokenboundSdk({
  // ... config
});

// Get raw response
const rawEvent = await sdk.eventManager.getEvent(1);

// Decode with explicit decoder
const event = ContractDecoder.event()(rawEvent);
```

### Custom Contract Decoders

Create decoders for your custom contracts:

```typescript
import {
  decodeStruct,
  decodeU32,
  decodeString,
  decodeAddress,
} from "@crowdpass/tokenbound-sdk";

// Define custom contract response decoder
const decodeMyContractResponse = decodeStruct({
  id: decodeU32,
  owner: decodeAddress,
  metadata: decodeString,
});

// Use it
const response = await myContract.getData();
const data = decodeMyContractResponse(response);
```

## Best Practices

### 1. Define Decoders Once

```typescript
// decoders.ts
export const decodeEvent = ContractDecoder.event();
export const decodeTier = ContractDecoder.ticketTier();

// usage.ts
import { decodeEvent } from "./decoders";
const event = decodeEvent(response);
```

### 2. Use Type Inference

```typescript
import {
  decodeStruct,
  decodeNumber,
  decodeString,
} from "@crowdpass/tokenbound-sdk";

const decodeUser = decodeStruct({
  id: decodeNumber,
  name: decodeString,
});

// TypeScript infers: { id: number; name: string }
type User = ReturnType<typeof decodeUser>;
```

### 3. Compose Complex Decoders

```typescript
// Build from simple to complex
const decodeAddress = decodeString;
const decodeAddressList = decodeArray(decodeAddress);
const decodeEventWithAttendees = decodeStruct({
  id: decodeU32,
  attendees: decodeAddressList,
});
```

### 4. Handle Optional Fields

```typescript
const decodeEventUpdate = decodeStruct({
  id: decodeU32,
  theme: decodeOption(decodeString),
  price: decodeOption(decodeI128),
  tickets: decodeOption(decodeU128),
});
```

### 5. Validate Business Logic

```typescript
const decodePositivePrice = decodeValidate(
  decodeI128,
  (price) => price > 0n,
  "Price must be positive",
);

const decodeEvent = decodeStruct({
  id: decodeU32,
  price: decodePositivePrice,
});
```

## Performance Considerations

### Decoder Reuse

Decoders are pure functions and can be reused:

```typescript
// Good: Define once, use many times
const decodeEvent = ContractDecoder.event();
const events = responses.map(decodeEvent);

// Avoid: Creating decoder in loop
responses.map((r) => ContractDecoder.event()(r));
```

### Early Validation

Decoders validate early and fail fast:

```typescript
// Fails immediately on first invalid field
const event = decodeEvent(response);
```

### Type Safety

Decoders provide compile-time type safety:

```typescript
const decodeUser = decodeStruct({
  id: decodeNumber,
  name: decodeString,
});

const user = decodeUser(data);
// TypeScript knows: user.id is number, user.name is string
```

## Testing

### Testing Decoders

```typescript
import {
  decodeStruct,
  decodeNumber,
  decodeString,
} from "@crowdpass/tokenbound-sdk";

describe("User Decoder", () => {
  const decodeUser = decodeStruct({
    id: decodeNumber,
    name: decodeString,
  });

  it("should decode valid user", () => {
    const user = decodeUser({ id: 1, name: "Alice" });
    expect(user).toEqual({ id: 1, name: "Alice" });
  });

  it("should throw on invalid user", () => {
    expect(() => decodeUser({ id: "invalid", name: "Alice" })).toThrow(
      DecoderError,
    );
  });
});
```

### Testing with Mock Data

```typescript
const mockEvent = {
  id: 1,
  theme: "Test Event",
  organizer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  // ... other fields
};

const event = ContractDecoder.event()(mockEvent);
expect(event.id).toBe(1);
```

## Migration Guide

### From Unsafe Type Assertions

**Before:**

```typescript
const event = response as EventRecord;
// No validation, runtime errors possible
```

**After:**

```typescript
const event = ContractDecoder.event()(response);
// Validated, type-safe, clear errors
```

### From Manual Validation

**Before:**

```typescript
function parseEvent(raw: any): EventRecord {
  if (typeof raw.id !== "number") throw new Error("Invalid id");
  if (typeof raw.theme !== "string") throw new Error("Invalid theme");
  // ... many more checks
  return raw as EventRecord;
}
```

**After:**

```typescript
const decodeEvent = ContractDecoder.event();
const event = decodeEvent(raw);
```

## Troubleshooting

### Common Errors

**"Expected string, got number"**

- The value type doesn't match the decoder
- Check the contract return type

**"Expected array, got object"**

- Using array decoder on non-array value
- Verify the contract response structure

**"Struct field 'x': Expected number, got undefined"**

- Missing required field in response
- Check if field should be optional

### Debugging

Enable detailed error messages:

```typescript
try {
  const event = decodeEvent(response);
} catch (error) {
  if (error instanceof DecoderError) {
    console.log("Failed to decode:", error.message);
    console.log("Value:", error.value);
    console.log("Expected type:", error.expectedType);
  }
}
```

## API Reference

See the [full API documentation](./src/decoders.ts) for all available decoders and utilities.

### Primitive Decoders

- `decodeString`
- `decodeNumber`
- `decodeBigInt`
- `decodeBoolean`
- `decodeBytes`
- `decodeAddress`
- `decodeSymbol`

### Composite Decoders

- `decodeArray`
- `decodeVec`
- `decodeOption`
- `decodeTuple`
- `decodeStruct`
- `decodeMap`

### Utility Decoders

- `decodeWithDefault`
- `decodeOneOf`
- `decodeTransform`
- `decodeValidate`
- `decodeLiteral`
- `decodeEnum`

### Soroban Decoders

- `decodeU32`, `decodeU64`, `decodeU128`
- `decodeI32`, `decodeI64`, `decodeI128`
- `decodeBytesN`
- `decodeVoid`

### Contract Decoders

- `ContractDecoder.event()`
- `ContractDecoder.ticketTier()`
- `ContractDecoder.buyerPurchase()`
- `ContractDecoder.tbaToken()`

## Examples

See [examples/decoder-usage.ts](./examples/decoder-usage.ts) for comprehensive examples.

## References

- [Soroban Documentation](https://soroban.stellar.org/docs)
- [Stellar SDK](https://stellar.github.io/js-stellar-sdk/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
