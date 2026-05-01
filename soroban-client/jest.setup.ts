import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";
import "@testing-library/jest-dom";

// Ensure TextEncoder/TextDecoder are available for node test environments.
if (typeof global.TextEncoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  global.TextEncoder = require("util").TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  global.TextDecoder = require("util").TextDecoder;
}

// Default test values for env vars validated by lib/env.ts. Tests that need
// different values can overwrite these before importing modules that read them.
process.env.NEXT_PUBLIC_HORIZON_URL ??= 'https://horizon.example';
process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??= 'https://rpc.example';
process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ??= 'Test SDF Network ; September 2015';
process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT ??= 'CTEST';
