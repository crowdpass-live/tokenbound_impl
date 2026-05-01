import {
  calculateDelay,
  DEFAULT_RETRY_CONFIG,
  isRetryableError,
  RetryPolicy,
  withRetry,
  type RetryConfig,
} from "../retry";

describe("Retry Policy", () => {
  describe("isRetryableError", () => {
    it("should identify network errors as retryable", () => {
      expect(isRetryableError(new Error("Network error occurred"))).toBe(true);
      expect(isRetryableError(new Error("ECONNREFUSED"))).toBe(true);
      expect(isRetryableError(new Error("ETIMEDOUT"))).toBe(true);
      expect(isRetryableError(new Error("ECONNRESET"))).toBe(true);
      expect(isRetryableError(new Error("socket hang up"))).toBe(true);
    });

    it("should identify rate limit errors as retryable", () => {
      expect(isRetryableError(new Error("Rate limit exceeded"))).toBe(true);
      expect(isRetryableError(new Error("Too many requests"))).toBe(true);
    });

    it("should identify HTTP 5xx errors as retryable", () => {
      expect(isRetryableError(new Error("HTTP 503 Service Unavailable"))).toBe(
        true,
      );
      expect(isRetryableError(new Error("502 Bad Gateway"))).toBe(true);
      expect(isRetryableError(new Error("504 Gateway Timeout"))).toBe(true);
    });

    it("should identify timeout errors as retryable", () => {
      expect(isRetryableError(new Error("Request timeout"))).toBe(true);
      expect(isRetryableError(new Error("Connection timeout"))).toBe(true);
    });

    it("should not identify non-retryable errors", () => {
      expect(isRetryableError(new Error("Invalid argument"))).toBe(false);
      expect(isRetryableError(new Error("Unauthorized"))).toBe(false);
      expect(isRetryableError(new Error("Not found"))).toBe(false);
      expect(isRetryableError(new Error("Bad request"))).toBe(false);
    });

    it("should handle non-Error objects", () => {
      expect(isRetryableError("Network error")).toBe(true);
      expect(isRetryableError("Invalid input")).toBe(false);
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });
  });

  describe("calculateDelay", () => {
    it("should calculate exponential backoff correctly", () => {
      const config = { ...DEFAULT_RETRY_CONFIG, enableJitter: false };

      expect(calculateDelay(0, config)).toBe(1000); // 1000 * 2^0
      expect(calculateDelay(1, config)).toBe(2000); // 1000 * 2^1
      expect(calculateDelay(2, config)).toBe(4000); // 1000 * 2^2
      expect(calculateDelay(3, config)).toBe(8000); // 1000 * 2^3
    });

    it("should respect maxDelayMs", () => {
      const config = {
        ...DEFAULT_RETRY_CONFIG,
        enableJitter: false,
        maxDelayMs: 5000,
      };

      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(2000);
      expect(calculateDelay(2, config)).toBe(4000);
      expect(calculateDelay(3, config)).toBe(5000); // Capped at maxDelayMs
      expect(calculateDelay(4, config)).toBe(5000); // Still capped
    });

    it("should apply jitter when enabled", () => {
      const config = { ...DEFAULT_RETRY_CONFIG, enableJitter: true };

      // Run multiple times to ensure jitter is applied
      const delays = Array.from({ length: 10 }, () =>
        calculateDelay(1, config),
      );

      // All delays should be around 2000ms but with variation
      const allSame = delays.every((d) => d === delays[0]);
      expect(allSame).toBe(false); // Jitter should cause variation

      // All delays should be within reasonable range (2000 ± 10%)
      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(1800);
        expect(delay).toBeLessThanOrEqual(2200);
      });
    });

    it("should use custom backoff multiplier", () => {
      const config = {
        ...DEFAULT_RETRY_CONFIG,
        enableJitter: false,
        backoffMultiplier: 3,
      };

      expect(calculateDelay(0, config)).toBe(1000); // 1000 * 3^0
      expect(calculateDelay(1, config)).toBe(3000); // 1000 * 3^1
      expect(calculateDelay(2, config)).toBe(9000); // 1000 * 3^2
    });

    it("should use custom initial delay", () => {
      const config = {
        ...DEFAULT_RETRY_CONFIG,
        enableJitter: false,
        initialDelayMs: 500,
      };

      expect(calculateDelay(0, config)).toBe(500);
      expect(calculateDelay(1, config)).toBe(1000);
      expect(calculateDelay(2, config)).toBe(2000);
    });
  });

  describe("withRetry", () => {
    beforeEach(() => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should succeed on first attempt", async () => {
      const fn = jest.fn().mockResolvedValue("success");
      const result = await withRetry(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("ETIMEDOUT"))
        .mockResolvedValue("success");

      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 10,
        enableJitter: false,
      };

      const result = await withRetry(fn, config);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable errors", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Invalid argument"));

      const config: RetryConfig = {
        maxRetries: 3,
        initialDelayMs: 10,
      };

      await expect(withRetry(fn, config)).rejects.toThrow("Invalid argument");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should throw after max retries exhausted", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("Network error"));

      const config: RetryConfig = {
        maxRetries: 2,
        initialDelayMs: 10,
        enableJitter: false,
      };

      await expect(withRetry(fn, config)).rejects.toThrow("Network error");
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should log retry attempts", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const config: RetryConfig = {
        maxRetries: 2,
        initialDelayMs: 10,
        enableJitter: false,
      };

      await withRetry(fn, config, "test operation");

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("RPC call failed (test operation)"),
        "Network error",
      );
    });

    it("should respect custom retry config", async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const config: RetryConfig = {
        maxRetries: 1,
        initialDelayMs: 50,
        backoffMultiplier: 3,
        enableJitter: false,
      };

      const startTime = Date.now();
      await withRetry(fn, config);
      const duration = Date.now() - startTime;

      expect(fn).toHaveBeenCalledTimes(2);
      expect(duration).toBeGreaterThanOrEqual(50); // At least initial delay
    });
  });

  describe("RetryPolicy", () => {
    beforeEach(() => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should execute function with default config", async () => {
      const policy = new RetryPolicy();
      const fn = jest.fn().mockResolvedValue("success");

      const result = await policy.execute(fn);

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should execute function with custom config", async () => {
      const policy = new RetryPolicy({
        maxRetries: 2,
        initialDelayMs: 10,
      });

      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue("success");

      const result = await policy.execute(fn, "custom operation");

      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should allow updating config", () => {
      const policy = new RetryPolicy({ maxRetries: 3 });

      expect(policy.getConfig().maxRetries).toBe(3);

      policy.updateConfig({ maxRetries: 5 });

      expect(policy.getConfig().maxRetries).toBe(5);
    });

    it("should return current config", () => {
      const customConfig: RetryConfig = {
        maxRetries: 5,
        initialDelayMs: 2000,
        maxDelayMs: 60000,
        backoffMultiplier: 3,
        enableJitter: false,
        jitterFactor: 0.2,
      };

      const policy = new RetryPolicy(customConfig);
      const config = policy.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.initialDelayMs).toBe(2000);
      expect(config.maxDelayMs).toBe(60000);
      expect(config.backoffMultiplier).toBe(3);
      expect(config.enableJitter).toBe(false);
      expect(config.jitterFactor).toBe(0.2);
    });

    it("should merge partial config with defaults", () => {
      const policy = new RetryPolicy({ maxRetries: 5 });
      const config = policy.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.initialDelayMs).toBe(DEFAULT_RETRY_CONFIG.initialDelayMs);
      expect(config.maxDelayMs).toBe(DEFAULT_RETRY_CONFIG.maxDelayMs);
      expect(config.backoffMultiplier).toBe(
        DEFAULT_RETRY_CONFIG.backoffMultiplier,
      );
      expect(config.enableJitter).toBe(DEFAULT_RETRY_CONFIG.enableJitter);
    });
  });
});
