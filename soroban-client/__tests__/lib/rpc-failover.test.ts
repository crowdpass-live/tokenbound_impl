import {
  RPCFailoverManager,
  DEFAULT_RPC_CONFIG,
  getRPCManager,
  initializeRPCManager,
} from "@/lib/rpc-failover";

// Mock the Stellar SDK
jest.mock("@stellar/stellar-sdk", () => ({
  Server: jest.fn().mockImplementation((url) => ({
    loadAccount: jest.fn().mockResolvedValue({}),
    fetchBaseFee: jest.fn().mockResolvedValue(100),
    ledgers: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          call: jest.fn().mockResolvedValue({ records: [] }),
        }),
      }),
    }),
    submitTransaction: jest.fn().mockResolvedValue({ hash: "test-hash" }),
  })),
  SorobanRpc: {
    Server: jest.fn().mockImplementation((url) => ({
      getNetwork: jest.fn().mockResolvedValue({}),
      simulateTransaction: jest.fn().mockResolvedValue({
        result: { retval: null },
      }),
    })),
  },
}));

describe("RPC Failover Manager", () => {
  beforeEach(() => {
    // Reset the global manager before each test
    (global as any).rpcManager = null;
    jest.clearAllMocks();
  });

  it("initializes with default configuration", () => {
    const manager = new RPCFailoverManager(DEFAULT_RPC_CONFIG);

    expect(manager).toBeDefined();
    const status = manager.getHealthStatus();
    expect(status.horizon).toHaveLength(2);
    expect(status.sorobanRpc).toHaveLength(2);
  });

  it("returns healthy Horizon server", async () => {
    const manager = new RPCFailoverManager(DEFAULT_RPC_CONFIG);
    const server = await manager.getHorizonServer();

    expect(server).toBeDefined();
    expect(server.loadAccount).toBeDefined();
  });

  it("returns healthy Soroban RPC server", async () => {
    const manager = new RPCFailoverManager(DEFAULT_RPC_CONFIG);
    const rpc = await manager.getSorobanRpcServer();

    expect(rpc).toBeDefined();
    expect(rpc.getNetwork).toBeDefined();
  });

  it("performs health checks on endpoints", async () => {
    const manager = new RPCFailoverManager(DEFAULT_RPC_CONFIG);

    // Force health check
    await manager.refreshHealthChecks();

    const status = manager.getHealthStatus();
    expect(status.lastHealthCheck).toBeGreaterThan(0);
  });

  it("selects best endpoint based on priority and health", async () => {
    const config = {
      ...DEFAULT_RPC_CONFIG,
      horizonUrls: [
        "https://primary-horizon.com",
        "https://secondary-horizon.com",
      ],
    };

    const manager = new RPCFailoverManager(config);

    // Mock one endpoint as unhealthy
    manager["horizonEndpoints"][1].isHealthy = false;

    const server = await manager.getHorizonServer();
    expect(server).toBeDefined();
  });

  it("throws error when no healthy endpoints available", async () => {
    const manager = new RPCFailoverManager(DEFAULT_RPC_CONFIG);

    // Mark all endpoints as unhealthy
    manager["horizonEndpoints"].forEach((endpoint) => {
      endpoint.isHealthy = false;
    });
    // Prevent an automatic refresh from re-marking endpoints as healthy.
    manager["lastHealthCheck"] = Date.now();

    await expect(manager.getHorizonServer()).rejects.toThrow(
      "No healthy Horizon endpoints available",
    );
  });

  it("supports custom configuration", () => {
    const customConfig = {
      ...DEFAULT_RPC_CONFIG,
      horizonUrls: ["https://custom-horizon.com"],
      sorobanRpcUrls: ["https://custom-rpc.com"],
      healthCheckInterval: 60000,
    };

    const manager = new RPCFailoverManager(customConfig);
    const status = manager.getHealthStatus();

    expect(status.horizon).toHaveLength(1);
    expect(status.horizon[0].url).toBe("https://custom-horizon.com");
    expect(status.sorobanRpc).toHaveLength(1);
    expect(status.sorobanRpc[0].url).toBe("https://custom-rpc.com");
  });

  it("provides global manager instance", () => {
    const manager1 = getRPCManager();
    const manager2 = getRPCManager();

    expect(manager1).toBe(manager2);
  });

  it("allows initialization with custom config", () => {
    const customConfig = {
      ...DEFAULT_RPC_CONFIG,
      healthCheckInterval: 120000,
    };

    const manager = initializeRPCManager(customConfig);
    const globalManager = getRPCManager();

    expect(manager).toBe(globalManager);
  });

  it("supports adding new endpoints", () => {
    const manager = new RPCFailoverManager(DEFAULT_RPC_CONFIG);

    manager.addHorizonEndpoint("https://new-horizon.com", 2);
    manager.addSorobanRpcEndpoint("https://new-rpc.com", 2);

    const status = manager.getHealthStatus();
    expect(status.horizon).toHaveLength(3);
    expect(status.sorobanRpc).toHaveLength(3);
    expect(status.horizon[2].url).toBe("https://new-horizon.com");
    expect(status.sorobanRpc[2].url).toBe("https://new-rpc.com");
  });

  it("supports removing endpoints", () => {
    const manager = new RPCFailoverManager(DEFAULT_RPC_CONFIG);

    const initialCount = manager.getHealthStatus().horizon.length;
    manager.removeEndpoint(DEFAULT_RPC_CONFIG.horizonUrls[0]);

    const status = manager.getHealthStatus();
    expect(status.horizon).toHaveLength(initialCount - 1);
  });

  it("supports updating endpoint priorities", () => {
    const manager = new RPCFailoverManager(DEFAULT_RPC_CONFIG);

    const url = DEFAULT_RPC_CONFIG.horizonUrls[0];
    manager.updateEndpointPriority(url, 10);

    const endpoint = manager
      .getHealthStatus()
      .horizon.find((e) => e.url === url);
    expect(endpoint?.priority).toBe(10);
  });
});
