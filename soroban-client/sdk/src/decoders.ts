/**
 * Typed decoder utilities for safely parsing Soroban contract return values
 */

import { scValToNative, xdr } from "@stellar/stellar-sdk";

/**
 * Decoder error thrown when decoding fails
 */
export class DecoderError extends Error {
  constructor(
    message: string,
    public readonly value: unknown,
    public readonly expectedType: string,
  ) {
    super(message);
    this.name = "DecoderError";
  }
}

/**
 * Decoder function type
 */
export type Decoder<T> = (value: unknown) => T;

/**
 * Decoder result type for safe decoding
 */
export type DecoderResult<T> =
  | { success: true; value: T }
  | { success: false; error: DecoderError };

/**
 * Safe decoder wrapper that returns a result instead of throwing
 */
export function safeDecode<T>(
  decoder: Decoder<T>,
  value: unknown,
): DecoderResult<T> {
  try {
    return { success: true, value: decoder(value) };
  } catch (error) {
    if (error instanceof DecoderError) {
      return { success: false, error };
    }
    return {
      success: false,
      error: new DecoderError(
        error instanceof Error ? error.message : String(error),
        value,
        "unknown",
      ),
    };
  }
}

/**
 * Decode ScVal to native JavaScript value
 */
export function decodeScVal<T = unknown>(scVal: xdr.ScVal): T {
  try {
    return scValToNative(scVal) as T;
  } catch (error) {
    throw new DecoderError(
      `Failed to decode ScVal: ${error instanceof Error ? error.message : String(error)}`,
      scVal,
      "ScVal",
    );
  }
}

// ============================================================================
// Primitive Decoders
// ============================================================================

/**
 * Decode to string
 */
export function decodeString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  throw new DecoderError(
    `Expected string, got ${typeof value}`,
    value,
    "string",
  );
}

/**
 * Decode to number
 */
export function decodeNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const num = Number(value);
    if (!Number.isNaN(num)) {
      return num;
    }
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  throw new DecoderError(
    `Expected number, got ${typeof value}`,
    value,
    "number",
  );
}

/**
 * Decode to bigint
 */
export function decodeBigInt(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(value);
  }
  if (typeof value === "string") {
    try {
      return BigInt(value);
    } catch {
      throw new DecoderError(
        `Invalid bigint string: ${value}`,
        value,
        "bigint",
      );
    }
  }
  throw new DecoderError(
    `Expected bigint, got ${typeof value}`,
    value,
    "bigint",
  );
}

/**
 * Decode to boolean
 */
export function decodeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  throw new DecoderError(
    `Expected boolean, got ${typeof value}`,
    value,
    "boolean",
  );
}

/**
 * Decode to Uint8Array (bytes)
 */
export function decodeBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }
  if (typeof value === "string") {
    // Try to decode hex string
    const hex = value.replace(/^0x/i, "");
    if (/^[0-9a-f]*$/i.test(hex) && hex.length % 2 === 0) {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
      }
      return bytes;
    }
  }
  throw new DecoderError(
    `Expected Uint8Array or hex string, got ${typeof value}`,
    value,
    "bytes",
  );
}

/**
 * Decode to address (Stellar address string)
 */
export function decodeAddress(value: unknown): string {
  const str = decodeString(value);
  // Basic validation for Stellar address format
  if (str.length === 56 && (str.startsWith("G") || str.startsWith("C"))) {
    return str;
  }
  throw new DecoderError(
    `Invalid Stellar address format: ${str}`,
    value,
    "address",
  );
}

/**
 * Decode to symbol
 */
export function decodeSymbol(value: unknown): string {
  return decodeString(value);
}

// ============================================================================
// Composite Decoders
// ============================================================================

/**
 * Decode to array with element decoder
 */
export function decodeArray<T>(elementDecoder: Decoder<T>): Decoder<T[]> {
  return (value: unknown): T[] => {
    if (!Array.isArray(value)) {
      throw new DecoderError(
        `Expected array, got ${typeof value}`,
        value,
        "array",
      );
    }
    return value.map((item, index) => {
      try {
        return elementDecoder(item);
      } catch (error) {
        if (error instanceof DecoderError) {
          throw new DecoderError(
            `Array element at index ${index}: ${error.message}`,
            value,
            `array<${error.expectedType}>`,
          );
        }
        throw error;
      }
    });
  };
}

/**
 * Decode to Vec (alias for array)
 */
export function decodeVec<T>(elementDecoder: Decoder<T>): Decoder<T[]> {
  return decodeArray(elementDecoder);
}

/**
 * Decode to optional value
 */
export function decodeOption<T>(decoder: Decoder<T>): Decoder<T | null> {
  return (value: unknown): T | null => {
    if (value === null || value === undefined) {
      return null;
    }
    // Handle Soroban Option format: { Some: value } or null
    if (typeof value === "object" && value !== null && "Some" in value) {
      return decoder((value as { Some: unknown }).Some);
    }
    // If it's not null and not an Option wrapper, try to decode it directly
    try {
      return decoder(value);
    } catch {
      return null;
    }
  };
}

/**
 * Decode to tuple with specific decoders for each element
 */
export function decodeTuple<T extends readonly unknown[]>(
  ...decoders: { [K in keyof T]: Decoder<T[K]> }
): Decoder<T> {
  return (value: unknown): T => {
    if (!Array.isArray(value)) {
      throw new DecoderError(
        `Expected tuple (array), got ${typeof value}`,
        value,
        "tuple",
      );
    }
    if (value.length !== decoders.length) {
      throw new DecoderError(
        `Expected tuple of length ${decoders.length}, got ${value.length}`,
        value,
        `tuple[${decoders.length}]`,
      );
    }
    return decoders.map((decoder, index) => {
      try {
        return decoder(value[index]);
      } catch (error) {
        if (error instanceof DecoderError) {
          throw new DecoderError(
            `Tuple element at index ${index}: ${error.message}`,
            value,
            `tuple[${index}]`,
          );
        }
        throw error;
      }
    }) as T;
  };
}

/**
 * Decode to object/struct with field decoders
 */
export function decodeStruct<T extends Record<string, unknown>>(fieldDecoders: {
  [K in keyof T]: Decoder<T[K]>;
}): Decoder<T> {
  return (value: unknown): T => {
    if (typeof value !== "object" || value === null) {
      throw new DecoderError(
        `Expected object, got ${typeof value}`,
        value,
        "struct",
      );
    }
    const obj = value as Record<string, unknown>;
    const result = {} as T;
    for (const [key, decoder] of Object.entries(fieldDecoders)) {
      try {
        result[key as keyof T] = decoder(obj[key]);
      } catch (error) {
        if (error instanceof DecoderError) {
          throw new DecoderError(
            `Struct field '${key}': ${error.message}`,
            value,
            `struct.${key}`,
          );
        }
        throw error;
      }
    }
    return result;
  };
}

/**
 * Decode to map/record
 */
export function decodeMap<K extends string | number, V>(
  keyDecoder: Decoder<K>,
  valueDecoder: Decoder<V>,
): Decoder<Record<K, V>> {
  return (value: unknown): Record<K, V> => {
    if (typeof value !== "object" || value === null) {
      throw new DecoderError(
        `Expected object/map, got ${typeof value}`,
        value,
        "map",
      );
    }
    const obj = value as Record<string, unknown>;
    const result = {} as Record<K, V>;
    for (const [key, val] of Object.entries(obj)) {
      try {
        const decodedKey = keyDecoder(key);
        const decodedValue = valueDecoder(val);
        result[decodedKey] = decodedValue;
      } catch (error) {
        if (error instanceof DecoderError) {
          throw new DecoderError(
            `Map entry '${key}': ${error.message}`,
            value,
            `map<${error.expectedType}>`,
          );
        }
        throw error;
      }
    }
    return result;
  };
}

// ============================================================================
// Utility Decoders
// ============================================================================

/**
 * Decode with fallback value if decoding fails
 */
export function decodeWithDefault<T>(
  decoder: Decoder<T>,
  defaultValue: T,
): Decoder<T> {
  return (value: unknown): T => {
    try {
      return decoder(value);
    } catch {
      return defaultValue;
    }
  };
}

/**
 * Decode one of multiple possible types
 */
export function decodeOneOf<T>(...decoders: Decoder<T>[]): Decoder<T> {
  return (value: unknown): T => {
    const errors: DecoderError[] = [];
    for (const decoder of decoders) {
      try {
        return decoder(value);
      } catch (error) {
        if (error instanceof DecoderError) {
          errors.push(error);
        }
      }
    }
    throw new DecoderError(
      `Failed to decode with any of ${decoders.length} decoders: ${errors.map((e) => e.message).join(", ")}`,
      value,
      "oneOf",
    );
  };
}

/**
 * Decode and transform value
 */
export function decodeTransform<T, U>(
  decoder: Decoder<T>,
  transform: (value: T) => U,
): Decoder<U> {
  return (value: unknown): U => {
    const decoded = decoder(value);
    return transform(decoded);
  };
}

/**
 * Decode and validate value
 */
export function decodeValidate<T>(
  decoder: Decoder<T>,
  validate: (value: T) => boolean,
  errorMessage: string,
): Decoder<T> {
  return (value: unknown): T => {
    const decoded = decoder(value);
    if (!validate(decoded)) {
      throw new DecoderError(errorMessage, value, typeof decoded as string);
    }
    return decoded;
  };
}

/**
 * Decode literal value
 */
export function decodeLiteral<T extends string | number | boolean>(
  literal: T,
): Decoder<T> {
  return (value: unknown): T => {
    if (value === literal) {
      return literal;
    }
    throw new DecoderError(
      `Expected literal ${JSON.stringify(literal)}, got ${JSON.stringify(value)}`,
      value,
      `literal<${typeof literal}>`,
    );
  };
}

/**
 * Decode enum value
 */
export function decodeEnum<T extends string>(
  enumValues: readonly T[],
  enumName = "enum",
): Decoder<T> {
  return (value: unknown): T => {
    const str = decodeString(value);
    if (enumValues.includes(str as T)) {
      return str as T;
    }
    throw new DecoderError(
      `Expected one of [${enumValues.join(", ")}], got ${str}`,
      value,
      enumName,
    );
  };
}

// ============================================================================
// Soroban-Specific Decoders
// ============================================================================

/**
 * Decode u32 (unsigned 32-bit integer)
 */
export function decodeU32(value: unknown): number {
  const num = decodeNumber(value);
  if (num < 0 || num > 4294967295 || !Number.isInteger(num)) {
    throw new DecoderError(
      `Expected u32 (0-4294967295), got ${num}`,
      value,
      "u32",
    );
  }
  return num;
}

/**
 * Decode u64 (unsigned 64-bit integer)
 */
export function decodeU64(value: unknown): number {
  const num = decodeNumber(value);
  if (num < 0 || !Number.isInteger(num)) {
    throw new DecoderError(
      `Expected u64 (non-negative integer), got ${num}`,
      value,
      "u64",
    );
  }
  return num;
}

/**
 * Decode u128 (unsigned 128-bit integer as bigint)
 */
export function decodeU128(value: unknown): bigint {
  const bigint = decodeBigInt(value);
  if (bigint < 0n) {
    throw new DecoderError(
      `Expected u128 (non-negative), got ${bigint}`,
      value,
      "u128",
    );
  }
  return bigint;
}

/**
 * Decode i32 (signed 32-bit integer)
 */
export function decodeI32(value: unknown): number {
  const num = decodeNumber(value);
  if (num < -2147483648 || num > 2147483647 || !Number.isInteger(num)) {
    throw new DecoderError(
      `Expected i32 (-2147483648 to 2147483647), got ${num}`,
      value,
      "i32",
    );
  }
  return num;
}

/**
 * Decode i64 (signed 64-bit integer)
 */
export function decodeI64(value: unknown): number {
  const num = decodeNumber(value);
  if (!Number.isInteger(num)) {
    throw new DecoderError(`Expected i64 (integer), got ${num}`, value, "i64");
  }
  return num;
}

/**
 * Decode i128 (signed 128-bit integer as bigint)
 */
export function decodeI128(value: unknown): bigint {
  return decodeBigInt(value);
}

/**
 * Decode BytesN (fixed-size bytes)
 */
export function decodeBytesN(size: number): Decoder<Uint8Array> {
  return (value: unknown): Uint8Array => {
    const bytes = decodeBytes(value);
    if (bytes.length !== size) {
      throw new DecoderError(
        `Expected BytesN<${size}>, got ${bytes.length} bytes`,
        value,
        `BytesN<${size}>`,
      );
    }
    return bytes;
  };
}

/**
 * Decode void/unit type
 */
export function decodeVoid(value: unknown): void {
  if (value === undefined || value === null) {
    return undefined;
  }
  throw new DecoderError(
    `Expected void/unit, got ${typeof value}`,
    value,
    "void",
  );
}

// ============================================================================
// Contract-Specific Decoders
// ============================================================================

/**
 * Decoder builder for contract return types
 */
export class ContractDecoder {
  /**
   * Create a decoder for Event struct
   */
  static event() {
    return decodeStruct({
      id: decodeU32,
      theme: decodeString,
      organizer: decodeAddress,
      event_type: decodeString,
      total_tickets: decodeU128,
      tickets_sold: decodeU128,
      ticket_price: decodeI128,
      start_date: decodeU64,
      end_date: decodeU64,
      is_canceled: decodeBoolean,
      ticket_nft_addr: decodeAddress,
      payment_token: decodeAddress,
    });
  }

  /**
   * Create a decoder for TicketTier struct
   */
  static ticketTier() {
    return decodeStruct({
      name: decodeString,
      price: decodeI128,
      total_quantity: decodeU128,
      sold_quantity: decodeU128,
    });
  }

  /**
   * Create a decoder for BuyerPurchase struct
   */
  static buyerPurchase() {
    return decodeStruct({
      quantity: decodeU128,
      total_paid: decodeI128,
    });
  }

  /**
   * Create a decoder for TBA token tuple
   */
  static tbaToken() {
    return decodeTuple(decodeU32, decodeAddress, decodeU128);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Decode contract response with automatic error handling
 */
export function decodeContractResponse<T>(
  decoder: Decoder<T>,
  response: unknown,
  context?: string,
): T {
  try {
    return decoder(response);
  } catch (error) {
    if (error instanceof DecoderError) {
      const contextMsg = context ? ` (${context})` : "";
      throw new DecoderError(
        `Failed to decode contract response${contextMsg}: ${error.message}`,
        response,
        error.expectedType,
      );
    }
    throw error;
  }
}

/**
 * Create a custom decoder with error context
 */
export function withContext<T>(
  decoder: Decoder<T>,
  context: string,
): Decoder<T> {
  return (value: unknown): T => {
    try {
      return decoder(value);
    } catch (error) {
      if (error instanceof DecoderError) {
        throw new DecoderError(
          `${context}: ${error.message}`,
          value,
          error.expectedType,
        );
      }
      throw error;
    }
  };
}
