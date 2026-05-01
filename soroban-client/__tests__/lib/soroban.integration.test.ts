const { TextEncoder, TextDecoder } = require("util");

globalThis.TextEncoder = globalThis.TextEncoder || TextEncoder;
globalThis.TextDecoder = globalThis.TextDecoder || TextDecoder;

const { nativeToScVal } = require("@stellar/stellar-base");
const TEST_PUBLIC_KEY = "GC2FS36XLXOUYURD3YLNWL6WBTBXCPN57FHN5X77JLRX7D2GF3PD7DMO";

const mockServer = {
  loadAccount: jest.fn().mockResolvedValue({
    accountId: () => "GORGANIZER",
    sequenceNumber: () => "1",
    incrementSequenceNumber: jest.fn(),
  }),
  fetchBaseFee: jest.fn().mockResolvedValue(100),
  submitTransaction: jest.fn().mockResolvedValue({ hash: "tx-hash" }),
  ledgers: jest.fn().mockReturnValue({
    order: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        call: jest.fn().mockResolvedValue({ records: [] }),
      }),
    }),
  }),
};

const mockRpc = {
  getNetwork: jest.fn().mockResolvedValue({}),
    sendTransaction: jest.fn().mockResolvedValue({ hash: "mockhash123", status: "PENDING" }),
    getTransaction: jest.fn().mockResolvedValue({ status: "SUCCESS", returnValue: null }),
  simulateTransaction: jest.fn().mockResolvedValue({ result: { retval: null }, cost: { cpuInsns: "0", memBytes: "0" }, latestLedger: 100, _parsed: true }),
};

jest.mock("@stellar/stellar-sdk", () => {
  const actual = jest.requireActual("@stellar/stellar-sdk");

  return {
    ...actual,
    default: actual,
    Server: jest.fn().mockImplementation(() => mockServer),
    SorobanRpc: {
      ...actual.SorobanRpc,
      Api: { ...actual.SorobanRpc?.Api, isSimulationError: jest.fn().mockReturnValue(false) },
      Server: jest.fn().mockImplementation(() => mockRpc),
    },
  };
});

describe("Soroban client integration tests with mocked Soroban environment", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    const actualStellar = jest.requireActual("@stellar/stellar-sdk");
    const actualBase = jest.requireActual("@stellar/stellar-base");
    const { Keypair } = actualStellar;
    const { StrKey } = actualBase;

    process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 1));
    process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 2));
    process.env.NEXT_PUBLIC_HORIZON_URL = "https://horizon.example";
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL = "https://rpc.example";
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
    process.env.NEXT_PUBLIC_TEST_ORGANIZER = Keypair.random().publicKey();
  });

  it("constructs and submits a createEvent transaction through Horizon", async () => {
    const { createEvent } = await import("@/lib/soroban");
    const { initializeRPCManager } = await import("@/lib/rpc-failover");

    initializeRPCManager({
      horizonUrls: ["https://horizon.example"],
      sorobanRpcUrls: ["https://rpc.example"],
      healthCheckInterval: 0,
      healthCheckTimeout: 1000,
      circuitBreakerThreshold: 1,
      cacheTtl: 1,
    });

    const organizerAddress = process.env.NEXT_PUBLIC_TEST_ORGANIZER!;

    const signTransactionFn = jest.fn(async (txXdr, options) => {
      expect(options).toEqual({
        networkPassphrase: "Test SDF Network ; September 2015",
        address: organizerAddress,
      });
      return txXdr;
    });

    const actualBase = jest.requireActual("@stellar/stellar-base");
    const crypto = require("crypto");
    const paymentTokenAddress = actualBase.Keypair.random().publicKey();

    const result = await createEvent(
      {
        organizer: organizerAddress,
        theme: "Soroban Launch",
        eventType: "conference",
        startTimeUnix: 1700000000,
        endTimeUnix: 1700003600,
        ticketPrice: BigInt(1000),
        totalTickets: BigInt(100),
        paymentToken: paymentTokenAddress,
      },
      signTransactionFn
    );

    expect(signTransactionFn).toHaveBeenCalledTimes(1);
    expect(mockServer.loadAccount).toHaveBeenCalledWith("GORGANIZER");
    expect(mockServer.fetchBaseFee).toHaveBeenCalled();
    expect(mockServer.submitTransaction).toHaveBeenCalled();
    expect(result).toEqual({ hash: "tx-hash" });
  });

  it("reads mocked contract event data from Soroban and decodes ScVal results", async () => {
    const { getAllEvents } = await import("@/lib/soroban");
    const { initializeRPCManager } = await import("@/lib/rpc-failover");

    initializeRPCManager({
      horizonUrls: ["https://horizon.example"],
      sorobanRpcUrls: ["https://rpc.example"],
      healthCheckInterval: 0,
      healthCheckTimeout: 1000,
      circuitBreakerThreshold: 1,
      cacheTtl: 1,
    });

    const organizerAddress = process.env.NEXT_PUBLIC_TEST_ORGANIZER!;
    const eventScVal = nativeToScVal([
      {
        id: 1,
        theme: "Mocked Soroban Event",
        organizer: organizerAddress,
        event_type: "webinar",
        total_tickets: BigInt(50),
        tickets_sold: BigInt(8),
        ticket_price: BigInt(250),
        start_date: 1700000000,
        end_date: 1700003600,
        is_canceled: false,
        ticket_nft_addr: "GTICKETNFT",
        payment_token: "GPAYMENTTOKEN",
      },
    ]);

    mockRpc.simulateTransaction.mockResolvedValue({ result: { retval: eventScVal } });

    const events = await getAllEvents();

    expect(mockRpc.getNetwork).toHaveBeenCalled();
    expect(mockRpc.simulateTransaction).toHaveBeenCalled();
    expect(events).toEqual([
      {
        id: 1,
        theme: "Mocked Soroban Event",
        organizer: process.env.NEXT_PUBLIC_TEST_ORGANIZER!,
        event_type: "webinar",
        total_tickets: BigInt(50),
        tickets_sold: BigInt(8),
        ticket_price: BigInt(250),
        start_date: 1700000000,
        end_date: 1700003600,
        is_canceled: false,
        ticket_nft_addr: "GTICKETNFT",
        payment_token: "GPAYMENTTOKEN",
      },
    ]);
  });
});
