jest.mock("@stellar/stellar-sdk", () => {
  const actualStellarSdk = jest.requireActual("@stellar/stellar-sdk");
  return {
    ...actualStellarSdk,
    rpc: {
      ...actualStellarSdk.rpc,
      assembleTransaction: jest.fn((tx: any) => ({ build: () => tx })),
    },
  };
});

import {
  Networks,
  StrKey,
  TransactionBuilder,
  Operation,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { SorobanSdkCore } from "../core";
import { EventManagerContract } from "../contracts";

describe("Soroban client integration with mocked Soroban environment", () => {
  const source = StrKey.encodeEd25519PublicKey(new Uint8Array(32));
  const contractId = StrKey.encodeContract(new Uint8Array(32));
  const config = {
    horizonUrl: "https://example.com/horizon",
    sorobanRpcUrl: "https://example.com/soroban-rpc",
    networkPassphrase: Networks.TESTNET,
    simulationSource: source,
    contracts: {
      eventManager: contractId,
    },
  };

  let core: SorobanSdkCore;
  let mockHorizon: any;
  let mockRpc: any;
  let simulateSpy: jest.SpiedFunction<typeof rpc.Api.isSimulationError>;

  beforeEach(() => {
    core = new SorobanSdkCore(config);

    mockHorizon = {
      loadAccount: jest.fn().mockResolvedValue({
        accountId: () => source,
        sequenceNumber: () => "42",
        incrementSequenceNumber: () => {},
      }),
      fetchBaseFee: jest.fn().mockResolvedValue(100),
    };

    mockRpc = {
      simulateTransaction: jest.fn().mockImplementation(async (tx: any) => ({
        id: "simulation-id",
        status: "OK",
        result: { retval: xdr.ScVal.scvU64(xdr.Uint64.fromString("1")) },
      })),
      sendTransaction: jest.fn().mockResolvedValue({
        hash: "test-hash",
        status: "SUCCESS",
      }),
      getTransaction: jest.fn().mockResolvedValue({
        status: rpc.Api.GetTransactionStatus.SUCCESS,
        ledger: 123,
      }),
    };

    Object.assign(core, {
      horizonServer: mockHorizon,
      rpcServer: mockRpc,
      retryPolicy: {
        execute: jest.fn(async (fn: () => Promise<any>) => fn()),
      },
    });

    simulateSpy = jest
      .spyOn(rpc.Api, "isSimulationError")
      .mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("constructs the correct transaction for a simulated contract read", async () => {
    const eventManager = new EventManagerContract(core);

    const readPromise = eventManager.getEventCount({ source });

    await expect(readPromise).resolves.toBe(1n);

    expect(mockHorizon.loadAccount).toHaveBeenCalledWith(source);
    expect(mockHorizon.fetchBaseFee).toHaveBeenCalled();
    expect(mockRpc.simulateTransaction).toHaveBeenCalledTimes(1);

    const tx = mockRpc.simulateTransaction.mock.calls[0][0];
    expect(tx.operations.length).toBe(1);
  });

  it("builds, signs, and submits a write transaction for contract interaction", async () => {
    const eventManager = new EventManagerContract(core);
    const submitted = await eventManager.createEventLegacy(
      {
        organizer: source,
        theme: "Test Event",
        eventType: "concert",
        startDate: 1,
        endDate: 2,
        ticketPrice: BigInt(1000),
        totalTickets: BigInt(10),
        paymentToken: source,
      },
      {
        source,
        signTransaction: jest.fn(async (txXdr: string) => txXdr),
      },
    );

    expect(submitted).toEqual({
      hash: "test-hash",
      ledger: 123,
      status: "SUCCESS",
    });
    expect(mockRpc.simulateTransaction).toHaveBeenCalled();
    expect(mockRpc.sendTransaction).toHaveBeenCalled();
    expect(mockRpc.getTransaction).toHaveBeenCalledWith("test-hash");
  });
});
