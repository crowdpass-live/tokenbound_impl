import {
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { nativeToScVal, scValToNative } from "@stellar/stellar-base";

import { mapSdkError } from "./errors";
import type {
  Bytes32Like,
  ContractCallArtifact,
  ContractName,
  InvokeOptions,
  PreparedTransaction,
  SorobanSubmitResult,
  TokenboundSdkConfig,
  WriteInvokeOptions,
} from "./types";

const DEFAULT_TIMEOUT = 30;

function parseHexBytes(input: string): Uint8Array {
  const normalized = input.replace(/^0x/i, "");
  if (normalized.length !== 64) {
    throw new Error("Expected a 32-byte hex string.");
  }
  const bytes = new Uint8Array(32);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
}

export function toBytesScVal(value: Bytes32Like): xdr.ScVal {
  const bytes = typeof value === "string" ? parseHexBytes(value) : value;
  return nativeToScVal(bytes, { type: "bytes" });
}

export function toOptionScVal(
  value: string | number | bigint | undefined,
  type: "string" | "u64" | "u128" | "i128"
): xdr.ScVal {
  if (value === undefined) {
    return nativeToScVal(null, { type: "option" });
  }
  return nativeToScVal({ Some: nativeToScVal(value, { type }) }, { type: "option" });
}

export class SorobanSdkCore {
  readonly config: TokenboundSdkConfig;
  readonly horizonServer: Horizon.Server;
  readonly rpcServer: rpc.Server;

  constructor(config: TokenboundSdkConfig) {
    this.config = config;
    this.horizonServer = new Horizon.Server(config.horizonUrl);
    this.rpcServer = new rpc.Server(config.sorobanRpcUrl);
  }

  getContractId(contract: ContractName): string {
    const contractId = this.config.contracts?.[contract];
    if (!contractId) {
      throw new Error(`Missing contract id for ${contract}.`);
    }
    return contractId;
  }

  hasContract(contract: ContractName): boolean {
    return Boolean(this.config.contracts?.[contract]);
  }

  getExplorerUrl(txHash: string): string {
    const base =
      this.config.networkPassphrase === Networks.TESTNET
        ? "https://stellar.expert/explorer/testnet/tx/"
        : "https://stellar.expert/explorer/public/tx/";
    return `${base}${txHash}`;
  }

  resolveReadSource(explicit?: string | null): string {
    const source = explicit ?? this.config.simulationSource;
    if (!source) {
      throw new Error(
        "A simulation source account is required for read calls. Provide one in the SDK config or per call."
      );
    }
    return source;
  }

  async buildInvokeTransaction(
    source: string,
    artifact: ContractCallArtifact,
    options?: InvokeOptions
  ) {
    const account = await this.horizonServer.loadAccount(source);
    const fee = options?.fee ?? Number(await this.horizonServer.fetchBaseFee());
    const operation = Operation.invokeContractFunction({
      contract: artifact.contractId,
      function: artifact.method,
      args: [...artifact.args],
    });

    return new TransactionBuilder(account, {
      fee: fee.toString(),
      networkPassphrase: this.config.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(options?.timeoutInSeconds ?? DEFAULT_TIMEOUT)
      .build();
  }

  async simulate(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options?: InvokeOptions
  ) {
    try {
      const source = this.resolveReadSource(options?.source ?? options?.simulationSource);
      const tx = await this.buildInvokeTransaction(source, artifact, options);
      const simulation = await this.rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(simulation)) {
        throw mapSdkError(contract, simulation.error, "Simulation failed.");
      }
      return simulation;
    } catch (error) {
      throw mapSdkError(contract, error, "Simulation failed.");
    }
  }

  async read<TNative>(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options?: InvokeOptions
  ): Promise<TNative> {
    const simulation = await this.simulate(contract, artifact, options);
    const returnValue = simulation.result?.retval;
    if (!returnValue) {
      return undefined as TNative;
    }
    return scValToNative(returnValue) as TNative;
  }

  async prepareWrite(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options: WriteInvokeOptions
  ): Promise<PreparedTransaction> {
    try {
      if (!options.source) {
        throw new Error("Write calls require a source account.");
      }
      const tx = await this.buildInvokeTransaction(options.source, artifact, options);
      const simulation = await this.rpcServer.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(simulation)) {
        throw mapSdkError(contract, simulation.error, "Simulation failed.");
      }
      const prepared = rpc.assembleTransaction(tx, simulation).build();
      return {
        xdr: prepared.toXDR(),
        networkPassphrase: this.config.networkPassphrase,
        source: options.source,
      };
    } catch (error) {
      throw mapSdkError(contract, error, "Preparing transaction failed.");
    }
  }

  async write(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options: WriteInvokeOptions
  ): Promise<SorobanSubmitResult> {
    try {
      const prepared = await this.prepareWrite(contract, artifact, options);
      const signedXdr = await options.signTransaction(prepared.xdr, {
        networkPassphrase: prepared.networkPassphrase,
        address: prepared.source,
      });
      const signedTx = TransactionBuilder.fromXDR(
        signedXdr,
        this.config.networkPassphrase
      );
      const sent = await this.rpcServer.sendTransaction(signedTx);
      if (sent.status === "ERROR") {
        throw new Error(sent.errorResultXdr || "Transaction submission failed.");
      }
      const confirmed = await this.waitForTransaction(sent.hash);
      return {
        hash: sent.hash,
        ledger: confirmed.ledger,
        status: confirmed.status,
      };
    } catch (error) {
      throw mapSdkError(contract, error, "Submitting transaction failed.");
    }
  }

  async waitForTransaction(hash: string, attempts = 40, delayMs = 1500) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const transaction = await this.rpcServer.getTransaction(hash);
      if (transaction.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        return transaction;
      }
      if (transaction.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction failed on-chain: ${hash}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    throw new Error(`Timed out waiting for transaction ${hash}.`);
  }
}
