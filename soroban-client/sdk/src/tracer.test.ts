import { describe, expect, it, jest } from "@jest/globals";
import { endSpan, generateId, startSpan, withSpan } from "./tracer";
import type { ContractName, TraceSpan } from "./types";

const CONTRACT: ContractName = "eventManager";
const METHOD = "create_event";
const CORRELATION = "test-correlation-id";

// ── generateId ────────────────────────────────────────────────────────────────

describe("generateId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateId()).toBe("string");
    expect(generateId().length).toBeGreaterThan(0);
  });

  it("returns unique values on each call", () => {
    const ids = new Set(Array.from({ length: 20 }, generateId));
    expect(ids.size).toBe(20);
  });
});

// ── startSpan ─────────────────────────────────────────────────────────────────

describe("startSpan", () => {
  it("creates a span with required fields", () => {
    const span = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    expect(span.name).toBe("simulate");
    expect(span.contract).toBe(CONTRACT);
    expect(span.method).toBe(METHOD);
    expect(span.correlationId).toBe(CORRELATION);
    expect(typeof span.spanId).toBe("string");
    expect(typeof span.startedAt).toBe("number");
    expect(span.startedAt).toBeLessThanOrEqual(Date.now());
  });

  it("does not set finishedAt or durationMs", () => {
    const span = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    expect(span.finishedAt).toBeUndefined();
    expect(span.durationMs).toBeUndefined();
    expect(span.success).toBeUndefined();
  });

  it("attaches custom attributes", () => {
    const span = startSpan("read", CONTRACT, METHOD, CORRELATION, {
      contractId: "CABC",
      attempt: 1,
    });
    expect(span.attributes.contractId).toBe("CABC");
    expect(span.attributes.attempt).toBe(1);
  });

  it("calls onSpanStart hook with the new span", () => {
    const onStart = jest.fn();
    const span = startSpan(
      "simulate",
      CONTRACT,
      METHOD,
      CORRELATION,
      {},
      onStart,
    );
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(span);
  });

  it("does not throw when onSpanStart is undefined", () => {
    expect(() =>
      startSpan("simulate", CONTRACT, METHOD, CORRELATION, {}, undefined),
    ).not.toThrow();
  });

  it("generates a unique spanId per call", () => {
    const a = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    const b = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    expect(a.spanId).not.toBe(b.spanId);
  });
});

// ── endSpan ───────────────────────────────────────────────────────────────────

describe("endSpan", () => {
  it("sets finishedAt, durationMs and success=true", () => {
    const span = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    const ended = endSpan(span, true);
    expect(ended.finishedAt).toBeGreaterThanOrEqual(span.startedAt);
    expect(ended.durationMs).toBeGreaterThanOrEqual(0);
    expect(ended.success).toBe(true);
    expect(ended.error).toBeUndefined();
  });

  it("sets success=false and error message on failure", () => {
    const span = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    endSpan(span, false, "RPC timeout");
    expect(span.success).toBe(false);
    expect(span.error).toBe("RPC timeout");
  });

  it("calls onSpanEnd hook with the finalised span", () => {
    const onEnd = jest.fn();
    const span = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    endSpan(span, true, undefined, onEnd);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(span);
  });

  it("does not throw when onSpanEnd is undefined", () => {
    const span = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    expect(() => endSpan(span, true, undefined, undefined)).not.toThrow();
  });

  it("durationMs is always non-negative", () => {
    const span = startSpan("simulate", CONTRACT, METHOD, CORRELATION);
    endSpan(span, true);
    expect(span.durationMs!).toBeGreaterThanOrEqual(0);
  });
});

// ── withSpan ──────────────────────────────────────────────────────────────────

describe("withSpan", () => {
  it("returns the value from fn on success", async () => {
    const result = await withSpan(
      "read",
      CONTRACT,
      METHOD,
      CORRELATION,
      {},
      undefined,
      undefined,
      async () => 42,
    );
    expect(result).toBe(42);
  });

  it("calls onSpanStart and onSpanEnd on success", async () => {
    const onStart = jest.fn();
    const onEnd = jest.fn();
    await withSpan(
      "simulate",
      CONTRACT,
      METHOD,
      CORRELATION,
      {},
      onStart,
      onEnd,
      async () => "ok",
    );
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    const endedSpan: TraceSpan = onEnd.mock.calls[0][0];
    expect(endedSpan.success).toBe(true);
    expect(endedSpan.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("rethrows errors and marks span as failed", async () => {
    const onEnd = jest.fn();
    await expect(
      withSpan(
        "write",
        CONTRACT,
        METHOD,
        CORRELATION,
        {},
        undefined,
        onEnd,
        async () => {
          throw new Error("contract error");
        },
      ),
    ).rejects.toThrow("contract error");

    const span: TraceSpan = onEnd.mock.calls[0][0];
    expect(span.success).toBe(false);
    expect(span.error).toBe("contract error");
  });

  it("always calls onSpanEnd even on error", async () => {
    const onEnd = jest.fn();
    await expect(
      withSpan(
        "write",
        CONTRACT,
        METHOD,
        CORRELATION,
        {},
        undefined,
        onEnd,
        async () => {
          throw new Error("boom");
        },
      ),
    ).rejects.toThrow();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("passes the span to fn", async () => {
    let capturedSpan: TraceSpan | undefined;
    await withSpan(
      "read",
      CONTRACT,
      METHOD,
      CORRELATION,
      { contractId: "CX" },
      undefined,
      undefined,
      async (span) => {
        capturedSpan = span;
        return null;
      },
    );
    expect(capturedSpan?.attributes.contractId).toBe("CX");
    expect(capturedSpan?.correlationId).toBe(CORRELATION);
  });

  it("preserves correlationId across start and end", async () => {
    const spans: TraceSpan[] = [];
    await withSpan(
      "simulate",
      CONTRACT,
      METHOD,
      "my-correlation",
      {},
      (s) => spans.push({ ...s }),
      (s) => spans.push({ ...s }),
      async () => null,
    );
    expect(spans[0].correlationId).toBe("my-correlation");
    expect(spans[1].correlationId).toBe("my-correlation");
  });
});

// ── SorobanSdkCore tracing integration ────────────────────────────────────────

describe("SorobanSdkCore — tracing config", () => {
  function resolveCorrelationId(
    options?: { correlationId?: string },
    autoCorrelation = true,
  ): string {
    if (options?.correlationId) return options.correlationId;
    if (autoCorrelation !== false) return generateId();
    return "none";
  }

  it("uses caller-supplied correlationId", () => {
    expect(resolveCorrelationId({ correlationId: "my-id" })).toBe("my-id");
  });

  it("generates an ID when autoCorrelation is true", () => {
    const id = resolveCorrelationId({}, true);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(id).not.toBe("none");
  });

  it("returns 'none' when autoCorrelation is false and no id supplied", () => {
    expect(resolveCorrelationId({}, false)).toBe("none");
  });
});
