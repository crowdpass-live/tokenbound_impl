/**
 * Runs before Jest loads test modules (via `setupFiles`).
 * Stellar SDK expects Web APIs that are not always present during early module init in jsdom.
 */
import { TextDecoder, TextEncoder } from "node:util";

Object.assign(globalThis, {
  TextEncoder,
  TextDecoder,
});
