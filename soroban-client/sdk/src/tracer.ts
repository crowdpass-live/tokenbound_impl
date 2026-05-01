/**
 * tracer.ts — Lightweight structured tracing for Soroban contract invocations.
 *
 * Produces TraceSpan objects that are passed to user-supplied hooks
 * (onSpanStart / onSpanEnd) without any external dependencies.
 */

import type { ContractName, OnSpanEnd, OnSpanStart, TraceSpan } from "./types";

// ── Correlation ID ────────────────────────────────────────────────────────────

let _counter = 0;

/**
 * Generate a simple unique ID.
 * Uses crypto.randomUUID when available (Node ≥ 19, modern browsers),
 * falls back to a counter-based ID for older environments.
 */
export function generateId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  _counter += 1;
  return `id-${Date.now()}-${_counter}`;
}

// ── Span lifecycle ────────────────────────────────────────────────────────────

/**
 * Create and start a new tracing span.
 *
 * @param name          Human-readable operation name (e.g. "simulate")
 * @param contract      Contract being invoked
 * @param method        Contract method being called
 * @param correlationId Links this span to a top-level invocation
 * @param attributes    Optional key-value metadata
 * @param onStart       Hook fired immediately after span creation
 */
export function startSpan(
  name: string,
  contract: ContractName,
  method: string,
  correlationId: string,
  attributes: TraceSpan["attributes"] = {},
  onStart?: OnSpanStart,
): TraceSpan {
  const span: TraceSpan = {
    spanId: generateId(),
    correlationId,
    name,
    contract,
    method,
    startedAt: Date.now(),
    attributes,
  };
  onStart?.(span);
  return span;
}

/**
 * Finish a tracing span, computing duration and marking success/failure.
 *
 * @param span    The span returned by `startSpan`
 * @param success Whether the operation succeeded
 * @param error   Optional error message on failure
 * @param onEnd   Hook fired after the span is finalised
 * @returns       The finalised span (mutated in-place for efficiency)
 */
export function endSpan(
  span: TraceSpan,
  success: boolean,
  error?: string,
  onEnd?: OnSpanEnd,
): TraceSpan {
  span.finishedAt = Date.now();
  span.durationMs = span.finishedAt - span.startedAt;
  span.success = success;
  if (error !== undefined) {
    span.error = error;
  }
  onEnd?.(span);
  return span;
}

/**
 * Convenience wrapper: run `fn`, automatically ending the span on
 * completion or error.
 *
 * @returns The value returned by `fn`
 */
export async function withSpan<T>(
  name: string,
  contract: ContractName,
  method: string,
  correlationId: string,
  attributes: TraceSpan["attributes"],
  onStart: OnSpanStart | undefined,
  onEnd: OnSpanEnd | undefined,
  fn: (span: TraceSpan) => Promise<T>,
): Promise<T> {
  const span = startSpan(
    name,
    contract,
    method,
    correlationId,
    attributes,
    onStart,
  );
  try {
    const result = await fn(span);
    endSpan(span, true, undefined, onEnd);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    endSpan(span, false, message, onEnd);
    throw err;
  }
}
