/**
 * Retry policy configuration for RPC calls
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  readonly maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  readonly initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  readonly maxDelayMs?: number;
  /** Exponential backoff multiplier (default: 2) */
  readonly backoffMultiplier?: number;
  /** Enable jitter to randomize delays (default: true) */
  readonly enableJitter?: boolean;
  /** Jitter factor (0-1, default: 0.1 means ±10% randomization) */
  readonly jitterFactor?: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  enableJitter: true,
  jitterFactor: 0.1,
};

/**
 * Errors that should trigger a retry
 */
const RETRYABLE_ERROR_PATTERNS = [
  /network/i,
  /timeout/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /ETIMEDOUT/i,
  /ECONNRESET/i,
  /socket hang up/i,
  /rate limit/i,
  /too many requests/i,
  /503/i,
  /502/i,
  /504/i,
  /temporarily unavailable/i,
];

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = errorMessage.toLowerCase();

  return RETRYABLE_ERROR_PATTERNS.some((pattern) => pattern.test(errorString));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>,
): number {
  // Calculate exponential backoff
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs,
  );

  // Apply jitter if enabled
  if (config.enableJitter) {
    const jitterRange = exponentialDelay * config.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange; // Random value between -jitterRange and +jitterRange
    return Math.max(0, exponentialDelay + jitter);
  }

  return exponentialDelay;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  context?: string,
): Promise<T> {
  const fullConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt >= fullConfig.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, fullConfig);
      const contextMsg = context ? ` (${context})` : "";
      console.warn(
        `RPC call failed${contextMsg}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${fullConfig.maxRetries})...`,
        error instanceof Error ? error.message : String(error),
      );

      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Retry policy for specific RPC operations
 */
export class RetryPolicy {
  private readonly config: Required<RetryConfig>;

  constructor(config: RetryConfig = {}) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    };
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    return withRetry(fn, this.config, context);
  }

  /**
   * Update retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<RetryConfig>> {
    return { ...this.config };
  }
}
