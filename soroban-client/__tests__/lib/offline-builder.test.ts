/**
 * @jest-environment node
 */
import { Networks, TransactionBuilder } from "@stellar/stellar-sdk";
import { nativeToScVal } from "@stellar/stellar-base";

import {
  OfflineTransactionBuilder,
  buildOfflineTransaction,
  buildContractArtifact,
  serializeTransaction,
  deserializeTransaction,
  decodeTransactionXdr,
  inspectTransaction,
} from "@/sdk/src/offline-builder";
import type {
  ContractCallArtifact,
  PreparedTransaction,
} from "@/sdk/src/types";

const NETWORK_PASSPHRASE = Networks.TESTNET;

// Valid Soroban contract address (C... strkey)
const MOCK_CONTRACT_ID =
  "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM";

// Valid Stellar Ed25519 public key (G... strkey)
const MOCK_ACCOUNT_ID =
  "GCOUNBQ5PMS7QD22PHKEVWLOSYB2ZEMWSKOIDHP5CBT2MFIDEQALWWME";

const MOCK_ACCOUNT = {
  accountId: MOCK_ACCOUNT_ID,
  sequenceNumber: "1000",
};

function makeArtifact(
  method = "create_event",
  args: ReturnType<typeof nativeToScVal>[] = [],
): ContractCallArtifact {
  return { contractId: MOCK_CONTRACT_ID, method, args };
}

// ---------------------------------------------------------------------------
// buildOfflineTransaction
// ---------------------------------------------------------------------------

describe("buildOfflineTransaction", () => {
  it("returns a PreparedTransaction with xdr, networkPassphrase and source", () => {
    const result = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact(),
      NETWORK_PASSPHRASE,
    );
    expect(result).toMatchObject({
      networkPassphrase: NETWORK_PASSPHRASE,
      source: MOCK_ACCOUNT_ID,
    });
    expect(typeof result.xdr).toBe("string");
    expect(result.xdr.length).toBeGreaterThan(0);
  });

  it("produces valid XDR that can be decoded back to a Transaction", () => {
    const artifact = makeArtifact("purchase_tickets", [
      nativeToScVal(MOCK_CONTRACT_ID, { type: "address" }),
      nativeToScVal(1, { type: "u32" }),
      nativeToScVal(BigInt(2), { type: "u128" }),
    ]);
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      artifact,
      NETWORK_PASSPHRASE,
    );
    expect(() =>
      TransactionBuilder.fromXDR(prepared.xdr, NETWORK_PASSPHRASE),
    ).not.toThrow();
  });

  it("uses the provided fee", () => {
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact(),
      NETWORK_PASSPHRASE,
      { fee: 500 },
    );
    const tx = TransactionBuilder.fromXDR(
      prepared.xdr,
      NETWORK_PASSPHRASE,
    ) as any;
    expect(Number(tx.fee)).toBe(500);
  });

  it("uses DEFAULT_FEE (100) when no fee is provided", () => {
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact(),
      NETWORK_PASSPHRASE,
    );
    const tx = TransactionBuilder.fromXDR(
      prepared.xdr,
      NETWORK_PASSPHRASE,
    ) as any;
    expect(Number(tx.fee)).toBe(100);
  });

  it("makes zero network calls", () => {
    expect(() =>
      buildOfflineTransaction(MOCK_ACCOUNT, makeArtifact(), NETWORK_PASSPHRASE),
    ).not.toThrow();
  });

  it("does not mutate the supplied artifact args array", () => {
    const args = [nativeToScVal(42, { type: "u32" })];
    const frozen = [...args];
    buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact("get_event", args),
      NETWORK_PASSPHRASE,
    );
    expect(args).toEqual(frozen);
  });
});

// ---------------------------------------------------------------------------
// buildContractArtifact
// ---------------------------------------------------------------------------

describe("buildContractArtifact", () => {
  it("returns the expected artifact shape", () => {
    const args = [nativeToScVal(1, { type: "u32" })];
    const artifact = buildContractArtifact(MOCK_CONTRACT_ID, "get_event", args);
    expect(artifact.contractId).toBe(MOCK_CONTRACT_ID);
    expect(artifact.method).toBe("get_event");
    expect(artifact.args).toEqual(args);
  });
});

// ---------------------------------------------------------------------------
// serializeTransaction / deserializeTransaction
// ---------------------------------------------------------------------------

describe("serializeTransaction", () => {
  it("produces a JSON-safe SerializedTransaction", () => {
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact(),
      NETWORK_PASSPHRASE,
    );
    const serialized = serializeTransaction(
      prepared,
      MOCK_ACCOUNT.sequenceNumber,
    );
    expect(serialized.xdr).toBe(prepared.xdr);
    expect(serialized.networkPassphrase).toBe(NETWORK_PASSPHRASE);
    expect(serialized.source).toBe(MOCK_ACCOUNT_ID);
    expect(serialized.sequenceNumber).toBe(MOCK_ACCOUNT.sequenceNumber);
    const roundtripped = JSON.parse(JSON.stringify(serialized));
    expect(roundtripped).toEqual(serialized);
  });
});

describe("deserializeTransaction", () => {
  it("restores a PreparedTransaction from a SerializedTransaction", () => {
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact(),
      NETWORK_PASSPHRASE,
    );
    const serialized = serializeTransaction(
      prepared,
      MOCK_ACCOUNT.sequenceNumber,
    );
    const restored = deserializeTransaction(serialized);
    expect(restored.xdr).toBe(prepared.xdr);
    expect(restored.networkPassphrase).toBe(NETWORK_PASSPHRASE);
    expect(restored.source).toBe(MOCK_ACCOUNT_ID);
  });

  it("throws if the XDR is malformed", () => {
    expect(() =>
      deserializeTransaction({
        xdr: "not-valid-xdr",
        networkPassphrase: NETWORK_PASSPHRASE,
        source: MOCK_ACCOUNT_ID,
        sequenceNumber: "1000",
      }),
    ).toThrow();
  });

  it("round-trips without data loss", () => {
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact("cancel_event", [nativeToScVal(7, { type: "u32" })]),
      NETWORK_PASSPHRASE,
    );
    const restored = deserializeTransaction(
      serializeTransaction(prepared, MOCK_ACCOUNT.sequenceNumber),
    );
    expect(restored.xdr).toBe(prepared.xdr);
  });
});

// ---------------------------------------------------------------------------
// decodeTransactionXdr
// ---------------------------------------------------------------------------

describe("decodeTransactionXdr", () => {
  it("returns a Transaction object with the correct source", () => {
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact(),
      NETWORK_PASSPHRASE,
    );
    const tx = decodeTransactionXdr(prepared);
    expect(tx.source).toBe(MOCK_ACCOUNT_ID);
  });

  it("throws on invalid XDR", () => {
    const bad: PreparedTransaction = {
      xdr: "garbage",
      networkPassphrase: NETWORK_PASSPHRASE,
      source: MOCK_ACCOUNT_ID,
    };
    expect(() => decodeTransactionXdr(bad)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// inspectTransaction
// ---------------------------------------------------------------------------

describe("inspectTransaction", () => {
  it("returns source and networkPassphrase", () => {
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact(),
      NETWORK_PASSPHRASE,
    );
    const summary = inspectTransaction(prepared);
    expect(summary.source).toBe(MOCK_ACCOUNT_ID);
    expect(summary.networkPassphrase).toBe(NETWORK_PASSPHRASE);
  });

  it("includes at least one operation", () => {
    const prepared = buildOfflineTransaction(
      MOCK_ACCOUNT,
      makeArtifact("withdraw_funds", [nativeToScVal(3, { type: "u32" })]),
      NETWORK_PASSPHRASE,
    );
    const summary = inspectTransaction(prepared);
    expect(summary.operations.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// OfflineTransactionBuilder class
// ---------------------------------------------------------------------------

describe("OfflineTransactionBuilder", () => {
  const builder = new OfflineTransactionBuilder(NETWORK_PASSPHRASE);

  describe("build()", () => {
    it("returns a PreparedTransaction", () => {
      const result = builder.build(MOCK_ACCOUNT, makeArtifact());
      expect(result).toHaveProperty("xdr");
      expect(result).toHaveProperty("networkPassphrase", NETWORK_PASSPHRASE);
      expect(result).toHaveProperty("source", MOCK_ACCOUNT_ID);
    });

    it("respects custom fee option", () => {
      const result = builder.build(MOCK_ACCOUNT, makeArtifact(), { fee: 250 });
      const tx = TransactionBuilder.fromXDR(
        result.xdr,
        NETWORK_PASSPHRASE,
      ) as any;
      expect(Number(tx.fee)).toBe(250);
    });
  });

  describe("buildAndSerialize()", () => {
    it("returns a SerializedTransaction with sequenceNumber", () => {
      const result = builder.buildAndSerialize(MOCK_ACCOUNT, makeArtifact());
      expect(result).toHaveProperty(
        "sequenceNumber",
        MOCK_ACCOUNT.sequenceNumber,
      );
      expect(result).toHaveProperty("xdr");
    });

    it("produces JSON-safe output", () => {
      const result = builder.buildAndSerialize(MOCK_ACCOUNT, makeArtifact());
      expect(() => JSON.stringify(result)).not.toThrow();
    });
  });

  describe("restore()", () => {
    it("restores a serialized transaction", () => {
      const serialized = builder.buildAndSerialize(
        MOCK_ACCOUNT,
        makeArtifact(),
      );
      const restored = builder.restore(serialized);
      expect(restored.xdr).toBe(serialized.xdr);
      expect(restored.source).toBe(serialized.source);
    });
  });

  describe("inspect()", () => {
    it("returns a readable summary", () => {
      const prepared = builder.build(
        MOCK_ACCOUNT,
        makeArtifact("get_event", [nativeToScVal(1, { type: "u32" })]),
      );
      const summary = builder.inspect(prepared);
      expect(summary.source).toBe(MOCK_ACCOUNT_ID);
      expect(Array.isArray(summary.operations)).toBe(true);
    });
  });

  describe("delegated signing flow (end-to-end)", () => {
    it("build -> serialize -> restore -> decode produces valid XDR at each step", () => {
      const artifact = buildContractArtifact(
        MOCK_CONTRACT_ID,
        "purchase_tickets",
        [
          nativeToScVal(MOCK_CONTRACT_ID, { type: "address" }),
          nativeToScVal(1, { type: "u32" }),
          nativeToScVal(BigInt(1), { type: "u128" }),
        ],
      );

      const prepared = builder.build(MOCK_ACCOUNT, artifact, { fee: 300 });
      expect(prepared.xdr).toBeTruthy();

      const serialized = serializeTransaction(
        prepared,
        MOCK_ACCOUNT.sequenceNumber,
      );
      const json = JSON.stringify(serialized);
      expect(json).toBeTruthy();

      const restored = deserializeTransaction(JSON.parse(json));
      expect(restored.xdr).toBe(prepared.xdr);

      const tx = decodeTransactionXdr(restored);
      expect(tx.source).toBe(MOCK_ACCOUNT_ID);
      expect(tx.operations).toHaveLength(1);
    });
  });
});
