import {
  GENERATED_CONTRACT_SPECS,
  createTokenboundSdk,
  decodeContractError,
} from "@/sdk/src";

describe("tokenbound sdk", () => {
  it("exposes generated specs for all contracts", () => {
    expect(Object.keys(GENERATED_CONTRACT_SPECS)).toEqual([
      "eventManager",
      "ticketFactory",
      "ticketNft",
      "tbaRegistry",
      "tbaAccount",
    ]);

    expect(
      GENERATED_CONTRACT_SPECS.eventManager.methods.some(
        (method) => method.name === "create_event"
      )
    ).toBe(true);
  });

  it("decodes mapped contract errors", () => {
    const decoded = decodeContractError("eventManager", "HostError: Error(Contract, #5)");
    expect(decoded).not.toBeNull();
    expect(decoded?.name).toBe("InvalidStartDate");
  });

  it("builds an sdk instance with contract awareness", () => {
    const sdk = createTokenboundSdk({
      horizonUrl: "https://horizon-testnet.stellar.org",
      sorobanRpcUrl: "https://soroban-testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
      contracts: {
        eventManager: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
      },
    });

    expect(sdk.hasContract("eventManager")).toBe(true);
    expect(sdk.hasContract("ticketFactory")).toBe(false);
    expect(sdk.getExplorerUrl("abc")).toContain("/explorer/testnet/tx/abc");
  });
});
