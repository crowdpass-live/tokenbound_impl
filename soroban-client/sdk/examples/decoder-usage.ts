/**
 * Examples of using typed decoder utilities for Soroban contract responses
 */

import {
  ContractDecoder,
  decodeAddress,
  decodeArray,
  decodeBigInt,
  decodeBoolean,
  decodeEnum,
  decodeI128,
  decodeNumber,
  decodeOneOf,
  decodeOption,
  decodeString,
  decodeStruct,
  decodeTransform,
  decodeTuple,
  decodeU128,
  decodeU32,
  decodeU64,
  decodeValidate,
  decodeWithDefault,
  safeDecode,
} from "../src";

// ============================================================================
// Example 1: Basic Primitive Decoding
// ============================================================================

function example1_primitives() {
  console.log("=== Example 1: Primitive Decoding ===");

  // Decode string
  const name = decodeString("Alice");
  console.log("Name:", name);

  // Decode number
  const age = decodeNumber(25);
  console.log("Age:", age);

  // Decode bigint
  const balance = decodeBigInt("1000000000");
  console.log("Balance:", balance);

  // Decode boolean
  const active = decodeBoolean(true);
  console.log("Active:", active);
}

// ============================================================================
// Example 2: Soroban-Specific Types
// ============================================================================

function example2_sorobanTypes() {
  console.log("\n=== Example 2: Soroban Types ===");

  // u32: event ID
  const eventId = decodeU32(123);
  console.log("Event ID:", eventId);

  // u64: timestamp
  const timestamp = decodeU64(1234567890);
  console.log("Timestamp:", timestamp);

  // u128: total tickets
  const totalTickets = decodeU128(1000n);
  console.log("Total Tickets:", totalTickets);

  // i128: ticket price
  const price = decodeI128(5000000000n);
  console.log("Price:", price);

  // Address
  const organizer = decodeAddress(
    "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  );
  console.log("Organizer:", organizer);
}

// ============================================================================
// Example 3: Arrays and Vectors
// ============================================================================

function example3_arrays() {
  console.log("\n=== Example 3: Arrays ===");

  // Array of numbers
  const eventIds = decodeArray(decodeU32)([1, 2, 3, 4, 5]);
  console.log("Event IDs:", eventIds);

  // Array of addresses
  const attendees = decodeArray(decodeAddress)([
    "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "GYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
  ]);
  console.log("Attendees:", attendees.length);

  // Nested arrays
  const matrix = decodeArray(decodeArray(decodeNumber))([
    [1, 2, 3],
    [4, 5, 6],
  ]);
  console.log("Matrix:", matrix);
}

// ============================================================================
// Example 4: Optional Values
// ============================================================================

function example4_optionals() {
  console.log("\n=== Example 4: Optional Values ===");

  const decodeOptionalPrice = decodeOption(decodeI128);

  // Null value
  const noPrice = decodeOptionalPrice(null);
  console.log("No price:", noPrice);

  // Some value (Soroban format)
  const somePrice = decodeOptionalPrice({ Some: 1000000000n });
  console.log("Some price:", somePrice);

  // Direct value
  const directPrice = decodeOptionalPrice(2000000000n);
  console.log("Direct price:", directPrice);
}

// ============================================================================
// Example 5: Structs/Objects
// ============================================================================

function example5_structs() {
  console.log("\n=== Example 5: Structs ===");

  // Define user decoder
  const decodeUser = decodeStruct({
    id: decodeU32,
    name: decodeString,
    email: decodeString,
    balance: decodeU128,
    active: decodeBoolean,
  });

  // Decode user
  const user = decodeUser({
    id: 1,
    name: "Alice",
    email: "alice@example.com",
    balance: 1000000000n,
    active: true,
  });

  console.log("User:", user);
}

// ============================================================================
// Example 6: Tuples
// ============================================================================

function example6_tuples() {
  console.log("\n=== Example 6: Tuples ===");

  // TBA token tuple: (chain_id, token_contract, token_id)
  const decodeToken = decodeTuple(decodeU32, decodeAddress, decodeU128);

  const token = decodeToken([
    1,
    "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    123n,
  ]);

  console.log("Token:", token);
  console.log("Chain ID:", token[0]);
  console.log("Contract:", token[1]);
  console.log("Token ID:", token[2]);
}

// ============================================================================
// Example 7: Contract-Specific Decoders
// ============================================================================

function example7_contractDecoders() {
  console.log("\n=== Example 7: Contract Decoders ===");

  // Decode Event
  const event = ContractDecoder.event()({
    id: 1,
    theme: "Web3 Conference 2024",
    organizer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    event_type: "Conference",
    total_tickets: 500n,
    tickets_sold: 250n,
    ticket_price: 1000000000n,
    start_date: 1234567890,
    end_date: 1234567900,
    is_canceled: false,
    ticket_nft_addr: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    payment_token: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  });

  console.log("Event:", event.theme);
  console.log("Tickets sold:", event.tickets_sold, "/", event.total_tickets);

  // Decode Ticket Tier
  const tier = ContractDecoder.ticketTier()({
    name: "VIP",
    price: 5000000000n,
    total_quantity: 50n,
    sold_quantity: 25n,
  });

  console.log("Tier:", tier.name, "-", tier.price);

  // Decode Buyer Purchase
  const purchase = ContractDecoder.buyerPurchase()({
    quantity: 2n,
    total_paid: 2000000000n,
  });

  console.log(
    "Purchase:",
    purchase.quantity,
    "tickets for",
    purchase.total_paid,
  );
}

// ============================================================================
// Example 8: Complex Nested Structures
// ============================================================================

function example8_nested() {
  console.log("\n=== Example 8: Nested Structures ===");

  // Event with tiers
  const decodeEventWithTiers = decodeStruct({
    id: decodeU32,
    name: decodeString,
    tiers: decodeArray(
      decodeStruct({
        name: decodeString,
        price: decodeI128,
        available: decodeU32,
      }),
    ),
    organizer: decodeAddress,
  });

  const event = decodeEventWithTiers({
    id: 1,
    name: "Tech Conference",
    tiers: [
      { name: "General", price: 1000000000n, available: 100 },
      { name: "VIP", price: 5000000000n, available: 20 },
      { name: "Student", price: 500000000n, available: 50 },
    ],
    organizer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  });

  console.log("Event:", event.name);
  console.log("Tiers:", event.tiers.map((t) => t.name).join(", "));
}

// ============================================================================
// Example 9: Transform Decoded Values
// ============================================================================

function example9_transform() {
  console.log("\n=== Example 9: Transform Values ===");

  // Decode and convert to uppercase
  const decodeUppercase = decodeTransform(decodeString, (s) => s.toUpperCase());

  const theme = decodeUppercase("web3 conference");
  console.log("Theme:", theme);

  // Decode price and convert to dollars
  const decodePriceInDollars = decodeTransform(
    decodeI128,
    (stroops) => Number(stroops) / 10000000, // Convert stroops to XLM
  );

  const priceInDollars = decodePriceInDollars(50000000n);
  console.log("Price:", priceInDollars, "XLM");

  // Decode timestamp and convert to Date
  const decodeDate = decodeTransform(
    decodeU64,
    (timestamp) => new Date(timestamp * 1000),
  );

  const eventDate = decodeDate(1234567890);
  console.log("Event date:", eventDate.toISOString());
}

// ============================================================================
// Example 10: Validate Decoded Values
// ============================================================================

function example10_validate() {
  console.log("\n=== Example 10: Validate Values ===");

  // Validate positive price
  const decodePositivePrice = decodeValidate(
    decodeI128,
    (price) => price > 0n,
    "Price must be positive",
  );

  try {
    const validPrice = decodePositivePrice(1000000000n);
    console.log("Valid price:", validPrice);

    const invalidPrice = decodePositivePrice(-1000n);
    console.log("Invalid price:", invalidPrice);
  } catch (error) {
    console.log("Validation error:", error.message);
  }

  // Validate email format
  const decodeEmail = decodeValidate(
    decodeString,
    (email) => email.includes("@"),
    "Invalid email format",
  );

  try {
    const validEmail = decodeEmail("alice@example.com");
    console.log("Valid email:", validEmail);
  } catch (error) {
    console.log("Validation error:", error.message);
  }
}

// ============================================================================
// Example 11: Decode with Default Values
// ============================================================================

function example11_defaults() {
  console.log("\n=== Example 11: Default Values ===");

  // Decode with default
  const decodeQuantityWithDefault = decodeWithDefault(decodeU128, 1n);

  const quantity1 = decodeQuantityWithDefault(5n);
  console.log("Quantity 1:", quantity1);

  const quantity2 = decodeQuantityWithDefault("invalid");
  console.log("Quantity 2 (default):", quantity2);

  // Decode optional with default
  const decodeOptionalName = decodeWithDefault(
    decodeOption(decodeString),
    "Anonymous",
  );

  const name1 = decodeOptionalName("Alice");
  console.log("Name 1:", name1);

  const name2 = decodeOptionalName(null);
  console.log("Name 2 (default):", name2);
}

// ============================================================================
// Example 12: Decode One of Multiple Types
// ============================================================================

function example12_oneOf() {
  console.log("\n=== Example 12: One Of ===");

  // Decode number or string
  const decodeNumberOrString = decodeOneOf(decodeNumber, decodeString);

  const value1 = decodeNumberOrString(42);
  console.log("Value 1:", value1, typeof value1);

  const value2 = decodeNumberOrString("hello");
  console.log("Value 2:", value2, typeof value2);

  // Decode bigint or number
  const decodeBigIntOrNumber = decodeOneOf(decodeBigInt, decodeNumber);

  const amount1 = decodeBigIntOrNumber(1000000000n);
  console.log("Amount 1:", amount1);

  const amount2 = decodeBigIntOrNumber(123);
  console.log("Amount 2:", amount2);
}

// ============================================================================
// Example 13: Decode Enum Values
// ============================================================================

function example13_enums() {
  console.log("\n=== Example 13: Enums ===");

  // Event type enum
  const decodeEventType = decodeEnum(
    ["Conference", "Concert", "Workshop", "Meetup"] as const,
    "EventType",
  );

  const type1 = decodeEventType("Conference");
  console.log("Type 1:", type1);

  try {
    const type2 = decodeEventType("Invalid");
    console.log("Type 2:", type2);
  } catch (error) {
    console.log("Enum error:", error.message);
  }

  // Status enum
  const decodeStatus = decodeEnum(
    ["pending", "active", "completed", "canceled"] as const,
    "Status",
  );

  const status = decodeStatus("active");
  console.log("Status:", status);
}

// ============================================================================
// Example 14: Safe Decoding
// ============================================================================

function example14_safeDecoding() {
  console.log("\n=== Example 14: Safe Decoding ===");

  // Safe decode returns result object
  const result1 = safeDecode(decodeNumber, 42);
  if (result1.success) {
    console.log("Success:", result1.value);
  }

  const result2 = safeDecode(decodeNumber, "invalid");
  if (!result2.success) {
    console.log("Error:", result2.error.message);
  }

  // Use in array processing
  const values = [1, "invalid", 3, "bad", 5];
  const decoded = values
    .map((v) => safeDecode(decodeNumber, v))
    .filter((r) => r.success)
    .map((r) => r.success && r.value);

  console.log("Decoded values:", decoded);
}

// ============================================================================
// Example 15: Real-World Usage with SDK
// ============================================================================

async function example15_realWorld() {
  console.log("\n=== Example 15: Real-World Usage ===");

  // Simulated contract response
  const mockEventResponse = {
    id: 1,
    theme: "Stellar Builders Summit 2024",
    organizer: "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    event_type: "Conference",
    total_tickets: 500n,
    tickets_sold: 350n,
    ticket_price: 2500000000n,
    start_date: 1735689600,
    end_date: 1735776000,
    is_canceled: false,
    ticket_nft_addr: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    payment_token: "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  };

  // Decode event
  const event = ContractDecoder.event()(mockEventResponse);

  console.log("Event Details:");
  console.log("  Theme:", event.theme);
  console.log("  Organizer:", event.organizer.substring(0, 10) + "...");
  console.log("  Type:", event.event_type);
  console.log("  Tickets:", event.tickets_sold, "/", event.total_tickets);
  console.log("  Price:", event.ticket_price, "stroops");
  console.log("  Canceled:", event.is_canceled);

  // Calculate availability
  const available = event.total_tickets - event.tickets_sold;
  const percentSold = Number((event.tickets_sold * 100n) / event.total_tickets);

  console.log("  Available:", available);
  console.log("  Sold:", percentSold.toFixed(1) + "%");
}

// ============================================================================
// Run All Examples
// ============================================================================

function runAllExamples() {
  example1_primitives();
  example2_sorobanTypes();
  example3_arrays();
  example4_optionals();
  example5_structs();
  example6_tuples();
  example7_contractDecoders();
  example8_nested();
  example9_transform();
  example10_validate();
  example11_defaults();
  example12_oneOf();
  example13_enums();
  example14_safeDecoding();
  example15_realWorld().catch(console.error);
}

// Uncomment to run examples
// runAllExamples();

export {
  example1_primitives,
  example2_sorobanTypes,
  example3_arrays,
  example4_optionals,
  example5_structs,
  example6_tuples,
  example7_contractDecoders,
  example8_nested,
  example9_transform,
  example10_validate,
  example11_defaults,
  example12_oneOf,
  example13_enums,
  example14_safeDecoding,
  example15_realWorld,
};
