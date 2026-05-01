import { Server, SorobanRpc } from "@stellar/stellar-sdk";

export interface RPCEndpoint {
  url: string;
  priority: number; // Lower number = higher priority
  lastHealthCheck: number;
  isHealthy: boolean;
  consecutiveFailures: number;
  responseTime: number;
}

export interface RPCConfig {
  horizonUrls: string[];
  sorobanRpcUrls: string[];
  healthCheckInterval: number; // milliseconds
  maxConsecutiveFailures: number;
  healthCheckTimeout: number; // milliseconds
  circuitBreakerThreshold: number;
  cacheTtl: number; // milliseconds
}

export class RPCFailoverManager {
  private config: RPCConfig;
  private horizonEndpoints: RPCEndpoint[] = [];
  private sorobanRpcEndpoints: RPCEndpoint[] = [];
  private lastHealthCheck: number = 0;
  private healthCheckPromise: Promise<void> | null = null;

  constructor(config: RPCConfig) {
    this.config = config;
    this.initializeEndpoints();
  }

  private initializeEndpoints(): void {
    // Initialize Horizon endpoints
    this.horizonEndpoints = this.config.horizonUrls.map((url, index) => ({
      url,
      priority: index,
      lastHealthCheck: 0,
      isHealthy: true,
      consecutiveFailures: 0,
      responseTime: 0,
    }));

    // Initialize Soroban RPC endpoints
    this.sorobanRpcEndpoints = this.config.sorobanRpcUrls.map((url, index) => ({
      url,
      priority: index,
      lastHealthCheck: 0,
      isHealthy: true,
      consecutiveFailures: 0,
      responseTime: 0,
    }));
  }

  /**
   * Get a healthy Horizon server instance
   */
  async getHorizonServer(): Promise<Server> {
    await this.ensureHealthChecks();
    const endpoint = this.getBestEndpoint(this.horizonEndpoints);

    if (!endpoint) {
      throw new Error("No healthy Horizon endpoints available");
    }

    return new Server(endpoint.url);
  }

  /**
   * Get a healthy Soroban RPC server instance
   */
  async getSorobanRpcServer(): Promise<SorobanRpc.Server> {
    await this.ensureHealthChecks();
    const endpoint = this.getBestEndpoint(this.sorobanRpcEndpoints);

    if (!endpoint) {
      throw new Error("No healthy Soroban RPC endpoints available");
    }

    return new SorobanRpc.Server(endpoint.url);
  }

  /**
   * Get the best available endpoint based on health, priority, and response time
   */
  private getBestEndpoint(endpoints: RPCEndpoint[]): RPCEndpoint | null {
    const healthyEndpoints = endpoints.filter((e) => e.isHealthy);

    if (healthyEndpoints.length === 0) {
      return null;
    }

    // Sort by priority (lower is better), then by response time (lower is better)
    healthyEndpoints.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.responseTime - b.responseTime;
    });

    return healthyEndpoints[0];
  }

  /**
   * Ensure health checks are up to date
   */
  private async ensureHealthChecks(): Promise<void> {
    const now = Date.now();

    if (now - this.lastHealthCheck < this.config.healthCheckInterval) {
      return;
    }

    if (this.healthCheckPromise) {
      return this.healthCheckPromise;
    }

    this.healthCheckPromise = this.performHealthChecks();
    await this.healthCheckPromise;
    this.healthCheckPromise = null;
    this.lastHealthCheck = now;
  }

  /**
   * Perform health checks on all endpoints
   */
  private async performHealthChecks(): Promise<void> {
    const checkPromises = [
      ...this.horizonEndpoints.map((endpoint) =>
        this.checkHorizonHealth(endpoint),
      ),
      ...this.sorobanRpcEndpoints.map((endpoint) =>
        this.checkSorobanRpcHealth(endpoint),
      ),
    ];

    await Promise.allSettled(checkPromises);
  }

  /**
   * Check health of a Horizon endpoint
   */
  private async checkHorizonHealth(endpoint: RPCEndpoint): Promise<void> {
    const startTime = Date.now();

    try {
      const server = new Server(endpoint.url);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout")),
          this.config.healthCheckTimeout,
        ),
      );

      // Try to get the latest ledger (lightweight health check)
      const healthCheckPromise = server.ledgers().order("desc").limit(1).call();

      await Promise.race([healthCheckPromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;
      endpoint.responseTime = responseTime;
      endpoint.isHealthy = true;
      endpoint.consecutiveFailures = 0;
      endpoint.lastHealthCheck = Date.now();
    } catch (error) {
      console.warn(
        `Horizon endpoint ${endpoint.url} health check failed:`,
        error,
      );
      endpoint.consecutiveFailures++;
      endpoint.lastHealthCheck = Date.now();

      if (endpoint.consecutiveFailures >= this.config.circuitBreakerThreshold) {
        endpoint.isHealthy = false;
      }
    }
  }

  /**
   * Check health of a Soroban RPC endpoint
   */
  private async checkSorobanRpcHealth(endpoint: RPCEndpoint): Promise<void> {
    const startTime = Date.now();

    try {
      const rpc = new SorobanRpc.Server(endpoint.url);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Timeout")),
          this.config.healthCheckTimeout,
        ),
      );

      // Try to get network info (lightweight health check)
      const healthCheckPromise = rpc.getNetwork();

      await Promise.race([healthCheckPromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;
      endpoint.responseTime = responseTime;
      endpoint.isHealthy = true;
      endpoint.consecutiveFailures = 0;
      endpoint.lastHealthCheck = Date.now();
    } catch (error) {
      console.warn(
        `Soroban RPC endpoint ${endpoint.url} health check failed:`,
        error,
      );
      endpoint.consecutiveFailures++;
      endpoint.lastHealthCheck = Date.now();

      if (endpoint.consecutiveFailures >= this.config.circuitBreakerThreshold) {
        endpoint.isHealthy = false;
      }
    }
  }

  /**
   * Get health status of all endpoints
   */
  getHealthStatus(): {
    horizon: RPCEndpoint[];
    sorobanRpc: RPCEndpoint[];
    lastHealthCheck: number;
  } {
    return {
      horizon: [...this.horizonEndpoints],
      sorobanRpc: [...this.sorobanRpcEndpoints],
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Force a health check refresh
   */
  async refreshHealthChecks(): Promise<void> {
    this.lastHealthCheck = 0;
    await this.ensureHealthChecks();
  }

  /**
   * Add a new Horizon endpoint
   */
  addHorizonEndpoint(
    url: string,
    priority: number = this.horizonEndpoints.length,
  ): void {
    this.horizonEndpoints.push({
      url,
      priority,
      lastHealthCheck: 0,
      isHealthy: true,
      consecutiveFailures: 0,
      responseTime: 0,
    });
  }

  /**
   * Add a new Soroban RPC endpoint
   */
  addSorobanRpcEndpoint(
    url: string,
    priority: number = this.sorobanRpcEndpoints.length,
  ): void {
    this.sorobanRpcEndpoints.push({
      url,
      priority,
      lastHealthCheck: 0,
      isHealthy: true,
      consecutiveFailures: 0,
      responseTime: 0,
    });
  }

  /**
   * Remove an endpoint by URL
   */
  removeEndpoint(url: string): void {
    this.horizonEndpoints = this.horizonEndpoints.filter((e) => e.url !== url);
    this.sorobanRpcEndpoints = this.sorobanRpcEndpoints.filter(
      (e) => e.url !== url,
    );
  }

  /**
   * Update endpoint priorities
   */
  updateEndpointPriority(url: string, newPriority: number): void {
    const horizonEndpoint = this.horizonEndpoints.find((e) => e.url === url);
    if (horizonEndpoint) {
      horizonEndpoint.priority = newPriority;
    }

    const rpcEndpoint = this.sorobanRpcEndpoints.find((e) => e.url === url);
    if (rpcEndpoint) {
      rpcEndpoint.priority = newPriority;
    }
  }
}

// Default configuration
export const DEFAULT_RPC_CONFIG: RPCConfig = {
  horizonUrls: [
    "https://horizon-testnet.stellar.org",
    "https://horizon-testnet-2.stellar.org", // Fallback
  ],
  sorobanRpcUrls: [
    "https://soroban-testnet.stellar.org",
    "https://soroban-testnet-2.stellar.org", // Fallback
  ],
  healthCheckInterval: 30000, // 30 seconds
  maxConsecutiveFailures: 3,
  healthCheckTimeout: 5000, // 5 seconds
  circuitBreakerThreshold: 3,
  cacheTtl: 60000, // 1 minute
};

// Global instance
let rpcManager: RPCFailoverManager | null = null;

/**
 * Get or create the global RPC failover manager
 */
export function getRPCManager(config?: Partial<RPCConfig>): RPCFailoverManager {
  if (!rpcManager) {
    const finalConfig = { ...DEFAULT_RPC_CONFIG, ...config };
    rpcManager = new RPCFailoverManager(finalConfig);
  }
  return rpcManager;
}

/**
 * Initialize RPC manager with custom configuration
 */
export function initializeRPCManager(
  config: Partial<RPCConfig>,
): RPCFailoverManager {
  const finalConfig = { ...DEFAULT_RPC_CONFIG, ...config };
  rpcManager = new RPCFailoverManager(finalConfig);
  return rpcManager;
}

/**
 * Helper functions for backward compatibility
 */
export async function getHorizonServer(): Promise<Server> {
  return getRPCManager().getHorizonServer();
}

export async function getSorobanRpcServer(): Promise<SorobanRpc.Server> {
  return getRPCManager().getSorobanRpcServer();
}
