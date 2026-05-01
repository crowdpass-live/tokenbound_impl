/**
 * Examples of using the retry policy in the Soroban SDK
 */

import { createTokenboundSdk, RetryPolicy, withRetry } from "../src";

// Example 1: Basic SDK usage with default retry policy
async function basicUsage() {
  const sdk = createTokenboundSdk({
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    contracts: {
      eventManager: "CXXX...",
    },
  });

  // All RPC calls automatically use retry policy
  const events = await sdk.eventManager.getAllEvents();
  console.log("Events:", events);
}

// Example 2: Custom retry configuration
async function customRetryConfig() {
  const sdk = createTokenboundSdk({
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    contracts: {
      eventManager: "CXXX...",
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

  const event = await sdk.eventManager.getEvent({ eventId: 1 });
  console.log("Event:", event);
}

// Example 3: Using RetryPolicy directly for custom operations
async function customRetryPolicy() {
  const retryPolicy = new RetryPolicy({
    maxRetries: 3,
    initialDelayMs: 1000,
    enableJitter: true,
  });

  // Retry a custom RPC operation
  const result = await retryPolicy.execute(async () => {
    // Your custom RPC call here
    const response = await fetch("https://soroban-testnet.stellar.org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getHealth",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }, "custom RPC health check");

  console.log("Health check result:", result);
}

// Example 4: Using withRetry helper for one-off retries
async function oneOffRetry() {
  const result = await withRetry(
    async () => {
      // One-off operation that needs retry
      const response = await fetch("https://api.example.com/data");
      return response.json();
    },
    {
      maxRetries: 2,
      initialDelayMs: 500,
      enableJitter: false,
    },
    "fetch external data",
  );

  console.log("Data:", result);
}

// Example 5: Different retry configs for different scenarios
async function scenarioBasedRetry() {
  // For critical user-facing operations (fail fast)
  const criticalSdk = createTokenboundSdk({
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    retryConfig: {
      maxRetries: 2,
      initialDelayMs: 500,
      maxDelayMs: 5000,
    },
  });

  // For background operations (more patient)
  const backgroundSdk = createTokenboundSdk({
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    retryConfig: {
      maxRetries: 5,
      initialDelayMs: 2000,
      maxDelayMs: 60000,
    },
  });

  // Use appropriate SDK based on context
  const userEvent = await criticalSdk.eventManager.getEvent({ eventId: 1 });
  console.log("User event:", userEvent);

  const allEvents = await backgroundSdk.eventManager.getAllEvents();
  console.log("All events:", allEvents);
}

// Example 6: Updating retry policy configuration
async function dynamicRetryConfig() {
  const retryPolicy = new RetryPolicy({
    maxRetries: 3,
    initialDelayMs: 1000,
  });

  // Get current config
  console.log("Initial config:", retryPolicy.getConfig());

  // Update config based on runtime conditions
  if (process.env.NODE_ENV === "production") {
    retryPolicy.updateConfig({
      maxRetries: 5,
      initialDelayMs: 2000,
    });
  }

  console.log("Updated config:", retryPolicy.getConfig());

  // Use the policy
  await retryPolicy.execute(async () => {
    // Your operation
  });
}

// Example 7: Error handling with retries
async function errorHandling() {
  const sdk = createTokenboundSdk({
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    contracts: {
      eventManager: "CXXX...",
    },
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
    },
  });

  try {
    // This will automatically retry on transient errors
    const result = await sdk.eventManager.createEvent(
      {
        organizer: "GXXX...",
        theme: "Web3 Conference",
        eventType: "Conference",
        startDate: 1790899200,
        endDate: 1790985600,
        ticketPrice: 1000_0000000n,
        totalTickets: 250n,
        paymentToken: "CXXX...",
      },
      {
        source: "GXXX...",
        signTransaction: async (xdr, opts) => {
          // Sign transaction
          return xdr; // Return signed XDR
        },
      },
    );

    console.log("Event created:", result);
  } catch (error) {
    // Error could be:
    // 1. Non-retryable error (thrown immediately)
    // 2. Retryable error after max retries exhausted
    console.error("Failed to create event:", error);

    // Handle error appropriately
    if (error instanceof Error) {
      if (error.message.includes("Network")) {
        console.error("Network issue - please try again later");
      } else if (error.message.includes("Invalid")) {
        console.error("Invalid input - please check your data");
      }
    }
  }
}

// Example 8: Monitoring retry behavior
async function monitoringRetries() {
  // Enable console warnings to see retry attempts
  const sdk = createTokenboundSdk({
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    contracts: {
      eventManager: "CXXX...",
    },
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
    },
  });

  // Watch console for retry warnings:
  // "RPC call failed (simulate eventManager.getEvent), retrying in 1023ms (attempt 1/3)... Network error"

  const event = await sdk.eventManager.getEvent({ eventId: 1 });
  console.log("Event:", event);
}

// Run examples
async function main() {
  console.log("=== Example 1: Basic Usage ===");
  await basicUsage().catch(console.error);

  console.log("\n=== Example 2: Custom Retry Config ===");
  await customRetryConfig().catch(console.error);

  console.log("\n=== Example 3: Custom Retry Policy ===");
  await customRetryPolicy().catch(console.error);

  console.log("\n=== Example 4: One-off Retry ===");
  await oneOffRetry().catch(console.error);

  console.log("\n=== Example 5: Scenario-based Retry ===");
  await scenarioBasedRetry().catch(console.error);

  console.log("\n=== Example 6: Dynamic Retry Config ===");
  await dynamicRetryConfig().catch(console.error);

  console.log("\n=== Example 7: Error Handling ===");
  await errorHandling().catch(console.error);

  console.log("\n=== Example 8: Monitoring Retries ===");
  await monitoringRetries().catch(console.error);
}

// Uncomment to run examples
// main().catch(console.error);
