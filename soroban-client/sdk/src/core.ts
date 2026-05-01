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
import { generateId, withSpan } from "./tracer";
import { RetryPolicy } from "./retry";
import type {
  Bytes32Like,
  ContractCallArtifact,
  ContractName,
  EventFilter,
  GasEstimateOptions,
  GasEstimation,
  GetEventsOptions,
  InvokeOptions,
  InvocationAfterContext,
  InvocationBeforeContext,
  InvocationStage,
  PreparedTransaction,
  SorobanEvent,
  SorobanSubmitResult,
  StreamEventsOptions,
  TokenboundSdkConfig,
  TraceSpan,
  WriteInvokeOptions,
} from "./types";
import { parseSimulationForGas } from "./gasEstimator";

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
  type: "string" | "u64" | "u128" | "i128",
): xdr.ScVal {
  if (value === undefined) {
    return nativeToScVal(null, { type: "option" });
  }
  return nativeToScVal(
    { Some: nativeToScVal(value, { type }) },
    { type: "option" },
  );
}

export class SorobanSdkCore {
  readonly config: TokenboundSdkConfig;
  readonly horizonServer: Horizon.Server;
  readonly rpcServer: rpc.Server;
  readonly retryPolicy: RetryPolicy;
  private readonly middleware;

  constructor(config: TokenboundSdkConfig) {
    this.config = config;
    this.horizonServer = new Horizon.Server(config.horizonUrl);
    this.rpcServer = new rpc.Server(config.sorobanRpcUrl);
    this.retryPolicy = new RetryPolicy(config.retryConfig);
    this.middleware = [...(config.middleware ?? [])];
  }

  // ── Tracing helpers ─────────────────────────────────────────────────────────

  private resolveCorrelationId(options?: InvokeOptions): string {
    if (options?.correlationId) return options.correlationId;
    if (this.config.tracing?.autoCorrelation !== false) return generateId();
    return "none";
  }

  private get onSpanStart() {
    return this.config.tracing?.onSpanStart;
  }

  private get onSpanEnd() {
    return this.config.tracing?.onSpanEnd;
  }

  private trace<T>(
    name: string,
    contract: ContractName,
    method: string,
    correlationId: string,
    attributes: TraceSpan["attributes"],
    fn: (span: TraceSpan) => Promise<T>,
  ): Promise<T> {
    return withSpan(
      name,
      contract,
      method,
      correlationId,
      attributes,
      this.onSpanStart,
      this.onSpanEnd,
      fn,
    );
  }

  // ── Core helpers ────────────────────────────────────────────────────────────

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
        "A simulation source account is required for read calls. Provide one in the SDK config or per call.",
      );
    }
    return source;
  }

  private async runWithMiddleware<T>({
    stage,
    contract,
    artifact,
    source,
    txHash,
    metadata,
    operation,
  }: {
    stage: InvocationStage;
    contract: ContractName;
    artifact: ContractCallArtifact;
    source?: string | null;
    txHash?: string;
    metadata?: Readonly<Record<string, unknown>>;
    operation: () => Promise<T>;
  }): Promise<T> {
    const startedAtMs = Date.now();
    const base: InvocationBeforeContext = {
      stage,
      contract,
      method: artifact.method,
      contractId: artifact.contractId,
      startedAtMs,
      source,
      txHash,
      metadata,
    };

    for (const hook of this.middleware) {
      await hook.before?.(base);
    }

    try {
      const result = await operation();
      const finishedAtMs = Date.now();
      const context: InvocationAfterContext = {
        ...base,
        finishedAtMs,
        durationMs: finishedAtMs - startedAtMs,
        success: true,
        result,
      };
      for (const hook of this.middleware) {
        await hook.after?.(context);
      }
      return result;
    } catch (error) {
      const finishedAtMs = Date.now();
      const context: InvocationAfterContext = {
        ...base,
        finishedAtMs,
        durationMs: finishedAtMs - startedAtMs,
        success: false,
        error,
      };
      for (const hook of this.middleware) {
        await hook.after?.(context);
      }
      throw error;
    }
  }

  async buildInvokeTransaction(
    source: string,
    artifact: ContractCallArtifact,
    options?: InvokeOptions,
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

  // ── Traced public API ───────────────────────────────────────────────────────

  async simulate(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options?: InvokeOptions,
  ) {
    const correlationId = this.resolveCorrelationId(options);
    return this.trace(
      "simulate",
      contract,
      artifact.method,
      correlationId,
      { contractId: artifact.contractId },
      async () => {
        try {
          const source = this.resolveReadSource(
            options?.source ?? options?.simulationSource,
          );
          const tx = await this.buildInvokeTransaction(
            source,
            artifact,
            options,
          );
          const simulation = await this.retryPolicy.execute(
            () => this.rpcServer.simulateTransaction(tx),
            `simulate ${contract}.${artifact.method}`,
          );
          if (rpc.Api.isSimulationError(simulation)) {
            throw mapSdkError(contract, simulation.error, "Simulation failed.");
          }
          return simulation;
        } catch (error) {
          throw mapSdkError(contract, error, "Simulation failed.");
        }
      }
    );
  }

  async read<TNative>(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options?: InvokeOptions,
  ): Promise<TNative> {
    const correlationId = this.resolveCorrelationId(options);
    return this.trace(
      "read",
      contract,
      artifact.method,
      correlationId,
      { contractId: artifact.contractId },
      async () => {
        const simulation = await this.simulate(contract, artifact, {
          ...options,
          correlationId,
        });
        const returnValue = simulation.result?.retval;
        if (!returnValue) {
          return undefined as TNative;
        }
        return scValToNative(returnValue) as TNative;
      },
    );
  }

  async prepareWrite(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options: WriteInvokeOptions,
  ): Promise<PreparedTransaction> {
    const correlationId = this.resolveCorrelationId(options);
    return this.trace(
      "prepareWrite",
      contract,
      artifact.method,
      correlationId,
      { contractId: artifact.contractId, source: options.source ?? "" },
      async () => {
        try {
          if (!options.source) {
            throw new Error("Write calls require a source account.");
          }
          const tx = await this.buildInvokeTransaction(
            options.source,
            artifact,
            options,
          );
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
      },
    );
  }

  async write(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options: WriteInvokeOptions,
  ): Promise<SorobanSubmitResult> {
    const correlationId = this.resolveCorrelationId(options);
    return this.trace(
      "write",
      contract,
      artifact.method,
      correlationId,
      { contractId: artifact.contractId, source: options.source ?? "" },
      async () => {
        try {
          const prepared = await this.prepareWrite(contract, artifact, {
            ...options,
            correlationId,
          });
          const signedXdr = await options.signTransaction(prepared.xdr, {
            networkPassphrase: prepared.networkPassphrase,
            address: prepared.source,
          });
          const signedTx = TransactionBuilder.fromXDR(
            signedXdr,
            this.config.networkPassphrase,
          );
          const sent = await this.retryPolicy.execute(
            () => this.rpcServer.sendTransaction(signedTx),
            `sendTransaction ${contract}.${artifact.method}`,
          );
          if (sent.status === "ERROR") {
            throw new Error(sent.errorResult ? String(sent.errorResult) : "Transaction submission failed.");
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
    );
  }

  async waitForTransaction(hash: string, attempts = 40, delayMs = 1500) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const transaction = await this.retryPolicy.execute(
        () => this.rpcServer.getTransaction(hash),
        `getTransaction ${hash}`,
      );
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

  /**
   * Estimates gas costs for a contract operation without executing it.
   * Simulates the transaction and returns detailed cost breakdown.
   *
   * @param contract - Name of the contract to call
   * @param artifact - Contract call details (contractId, method, args)
   * @param options - Gas estimation options including source account
   * @returns Gas estimation with costs, resources, and summary
   *
   * @example
   * ```typescript
   * const gas = await sdk.estimateGas('eventManager', artifact, {
   *   source: 'GABC...',
   *   feeBufferMultiplier: 1.3
   * });
   *
   * console.log(gas.summary);
   * // "Estimated gas: 0.0001234 XLM (max: 0.0001481 XLM). Resources: 50000 instructions, 1024 bytes I/O."
   *
   * console.log(formatGasDisplay(gas));
   * // Prints formatted gas report
   * ```
   */
  async estimateGas(
    contract: ContractName,
    artifact: ContractCallArtifact,
    options: GasEstimateOptions = {},
  ): Promise<GasEstimation> {
    const correlationId = this.resolveCorrelationId(options);
    return this.trace(
      "estimateGas",
      contract,
      artifact.method,
      correlationId,
      { contractId: artifact.contractId },
      async () => {
        try {
          // Use provided source or fall back to simulation source
          const source = options.source || this.resolveReadSource(options.simulationSource);

          // Build transaction for simulation
          const tx = await this.buildInvokeTransaction(source, artifact, options);

          // Get base fee for calculation
          const baseFee = options.fee ?? Number(await this.horizonServer.fetchBaseFee());

          // Simulate transaction
          const simulation = await this.retryPolicy.execute(
            () => this.rpcServer.simulateTransaction(tx),
            `estimateGas ${contract}.${artifact.method}`
          );

          // Check for simulation errors
          if (rpc.Api.isSimulationError(simulation)) {
            return {
              costs: {
                baseFee,
                resourceFee: 0,
                refundableFee: 0,
                totalFee: baseFee,
                maxFee: baseFee,
              },
              resources: {
                instructions: 0,
                readBytes: 0,
                writeBytes: 0,
                entryReads: 0,
                entryWrites: 0,
                transactionSizeBytes: 0,
                metadataSizeBytes: 0,
              },
              success: false,
              summary: `Simulation failed: ${simulation.error}`,
              rawSimulation: options.includeRawSimulation ? simulation : undefined,
            };
          }

          // Parse simulation into gas estimation
          const bufferMultiplier = options.feeBufferMultiplier ?? 1.2;
          const estimation = parseSimulationForGas(
            simulation as rpc.Api.SimulateTransactionSuccessResponse,
            baseFee,
            bufferMultiplier
          );

          // Optionally strip raw simulation for cleaner output
          if (!options.includeRawSimulation) {
            const { rawSimulation, ...cleanEstimation } = estimation;
            return cleanEstimation as GasEstimation;
          }

          return estimation;
        } catch (error) {
          throw mapSdkError(contract, error, "Gas estimation failed.");
        }
      }
    );
  }

  async getEvents(
    options: GetEventsOptions,
  ): Promise<{ events: SorobanEvent[]; latestLedger: number }> {
    const correlationId = this.resolveCorrelationId(options);
    return this.trace(
      "getEvents",
      "tbaRegistry",
      "getEvents",
      correlationId,
      {},
      async () => {
        try {
          const request: rpc.Api.GetEventsRequest = {
            startLedger: options.startLedger,
            filters: options.filters as any,
            pagination: {
              cursor: options.cursor,
              limit: options.limit,
            },
          };
          const response = await this.retryPolicy.execute(
            () => this.rpcServer.getEvents(request),
            "getEvents"
          );

          return {
            events: response.events.map((e) => ({
              id: e.id,
              type: e.type,
              ledger: e.ledger,
              ledgerClosedAt: e.ledgerClosedAt,
              contractId: e.contractId,
              topics: e.topic as string[],
              value: typeof e.value === "string" ? e.value : e.value.toXDR("base64"),
              inSuccessfulContractCall: e.inSuccessfulContractCall,
            })),
            latestLedger: response.latestLedger,
          };
        } catch (error) {
          throw mapSdkError("tbaRegistry", error, "Fetching events failed.");
        }
      }
    );
  }

  async *streamEvents(
    options: StreamEventsOptions,
  ): AsyncGenerator<SorobanEvent[], void, unknown> {
    let currentCursor = options.cursor;
    let startLedger = options.startLedger;
    const pollInterval = options.pollInterval ?? 5000;

    if (!currentCursor && !startLedger) {
      const latest = await this.retryPolicy.execute(
        () => this.rpcServer.getLatestLedger(),
        "getLatestLedger"
      );
      startLedger = latest.sequence;
    }

    while (true) {
      const { events, latestLedger } = await this.getEvents({
        ...options,
        cursor: currentCursor,
        startLedger: currentCursor ? undefined : startLedger,
      });

      if (events.length > 0) {
        currentCursor = events[events.length - 1].id;
        yield events;
      } else if (!currentCursor && latestLedger) {
        startLedger = latestLedger;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
