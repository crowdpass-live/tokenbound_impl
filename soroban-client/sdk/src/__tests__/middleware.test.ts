import { nativeToScVal } from "@stellar/stellar-base";
import { TransactionBuilder } from "@stellar/stellar-sdk";

import { SorobanSdkCore } from "../core";
import type { InvocationAfterContext, InvocationBeforeContext } from "../types";

describe("invocation middleware", () => {
  it("runs before/after hooks for read and simulate lifecycle", async () => {
    const before: InvocationBeforeContext[] = [];
    const after: InvocationAfterContext[] = [];

    const core = new SorobanSdkCore({
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      simulationSource:
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      middleware: [
        {
          before: (ctx) => before.push(ctx),
          after: (ctx) => after.push(ctx),
        },
      ],
    });

    const artifact = {
      contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
      method: "get_event_count",
      args: [],
    };

    (core as any).buildInvokeTransaction = jest.fn().mockResolvedValue({});
    (core as any).retryPolicy.execute = jest.fn(
      async (fn: () => Promise<unknown>) => fn(),
    );
    (core as any).rpcServer.simulateTransaction = jest.fn().mockResolvedValue({
      result: { retval: nativeToScVal(12, { type: "u32" }) },
    });

    const value = await core.read<number>("eventManager", artifact, {});

    expect(value).toBe(12);
    expect(before.map((ctx) => ctx.stage)).toEqual(["read", "simulate"]);
    expect(after.map((ctx) => ctx.stage)).toEqual(["simulate", "read"]);
    expect(after.every((ctx) => ctx.success)).toBe(true);
  });

  it("runs write/send/wait hooks and captures errors", async () => {
    const before: InvocationBeforeContext[] = [];
    const after: InvocationAfterContext[] = [];

    const core = new SorobanSdkCore({
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      middleware: [
        {
          before: (ctx) => before.push(ctx),
          after: (ctx) => after.push(ctx),
        },
      ],
    });

    const artifact = {
      contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
      method: "purchase_ticket",
      args: [],
    };

    (core as any).prepareWrite = jest.fn().mockResolvedValue({
      xdr: "AAAA",
      networkPassphrase: "Test SDF Network ; September 2015",
      source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    });
    const fromXdrSpy = jest
      .spyOn(TransactionBuilder, "fromXDR")
      .mockReturnValue({} as never);
    (core as any).rpcServer.sendTransaction = jest
      .fn()
      .mockResolvedValue({ status: "PENDING", hash: "abc123" });
    (core as any).retryPolicy.execute = jest.fn(
      async (fn: () => Promise<unknown>) => fn(),
    );
    (core as any).waitForTransaction = jest
      .fn()
      .mockRejectedValue(new Error("boom from confirmation"));

    await expect(
      core.write("eventManager", artifact, {
        source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        signTransaction: async () => "AAAA",
      }),
    ).rejects.toThrow("boom from confirmation");

    fromXdrSpy.mockRestore();

    expect(before.map((ctx) => ctx.stage)).toEqual([
      "write",
      "sendTransaction",
      "waitForTransaction",
    ]);
    const writeAfter = after.find((ctx) => ctx.stage === "write");
    expect(writeAfter?.success).toBe(false);
    expect(writeAfter?.error).toBeDefined();
  });
});
