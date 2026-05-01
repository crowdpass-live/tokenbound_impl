import type { xdr } from "@stellar/stellar-sdk";
import type { RetryConfig } from "./retry";

export type ContractName =
  | "eventManager"
  | "ticketFactory"
  | "ticketNft"
  | "tbaRegistry"
  | "tbaAccount";

export type AddressLike = string;
export type Bytes32Like = string | Uint8Array;

export interface TokenboundSdkConfig {
  readonly horizonUrl: string;
  readonly sorobanRpcUrl: string;
  readonly networkPassphrase: string;
  readonly simulationSource?: string | null;
  readonly contracts?: Partial<Record<ContractName, string | null | undefined>>;
  /** Optional tracing hooks for observability. */
  readonly tracing?: TracingConfig;
  readonly retryConfig?: RetryConfig;
  readonly middleware?: readonly InvocationMiddleware[];
}

export interface InvokeOptions {
  readonly source?: string | null;
  readonly simulationSource?: string | null;
  readonly fee?: number;
  readonly timeoutInSeconds?: number;
  /** Caller-supplied correlation ID to link spans across calls. */
  readonly correlationId?: string;
}
export interface WriteInvokeOptions extends InvokeOptions {
  readonly signTransaction: SignTransactionFn;
}

export interface PreparedTransaction {
  readonly xdr: string;
  readonly networkPassphrase: string;
  readonly source: string;
}

// Submission results represent the on-chain transaction outcome after send + confirmation.
export interface SorobanSubmitResult {
  readonly hash: string;
  readonly ledger: number;
  readonly status: string;
}

export type SignTransactionFn = (
  txXdr: string,
  options: { networkPassphrase: string; address: string },
) => Promise<string>;

export interface TicketTier {
  readonly name: string;
  readonly price: bigint;
  readonly totalQuantity: bigint;
  readonly soldQuantity: bigint;
}

export interface TierConfig {
  readonly name: string;
  readonly price: bigint;
  readonly totalQuantity: bigint;
}

export interface EventRecord {
  readonly id: number;
  readonly theme: string;
  readonly organizer: string;
  readonly eventType: string;
  readonly totalTickets: bigint;
  readonly ticketsSold: bigint;
  readonly ticketPrice: bigint;
  readonly startDate: number;
  readonly endDate: number;
  readonly isCanceled: boolean;
  readonly ticketNftAddress: string;
  readonly paymentToken: string;
}

export interface BuyerPurchase {
  readonly quantity: bigint;
  readonly totalPaid: bigint;
}

export interface CreateEventInput {
  readonly organizer: string;
  readonly theme: string;
  readonly eventType: string;
  readonly startDate: number;
  readonly endDate: number;
  readonly ticketPrice: bigint;
  readonly totalTickets: bigint;
  readonly paymentToken: string;
  readonly tiers?: readonly TierConfig[];
}

export interface CreateEventLegacyInput extends Omit<
  CreateEventInput,
  "tiers"
> {}

export interface UpdateEventInput {
  readonly organizer: string;
  readonly eventId: number;
  readonly theme?: string;
  readonly ticketPrice?: bigint;
  readonly totalTickets?: bigint;
  readonly startDate?: number;
  readonly endDate?: number;
}

export interface PurchaseTicketInput {
  readonly buyer: string;
  readonly eventId: number;
  readonly tierIndex?: number;
}

export interface PurchaseTicketsInput {
  readonly buyer: string;
  readonly eventId: number;
  readonly quantity: bigint;
}

export interface CreateAccountInput {
  readonly implementationHash: Bytes32Like;
  readonly tokenContract: string;
  readonly tokenId: bigint;
  readonly salt: Bytes32Like;
}

export interface InitializeTbaAccountInput extends CreateAccountInput {}

export interface ExecuteTbaCallInput {
  readonly to: string;
  readonly func: string;
  readonly args?: readonly unknown[];
}

export interface ContractCallArtifact {
  readonly contractId: string;
  readonly method: string;
  readonly args: readonly xdr.ScVal[];
}
// ── Tracing & Observability ───────────────────────────────────────────────────

/**
 * A single tracing span representing one unit of work within a contract
 * invocation (e.g. simulate, sign, submit, confirm).
 */
export interface TraceSpan {
  /** Unique span identifier (UUID v4). */
  readonly spanId: string;
  /** Correlation ID linking all spans for one top-level invocation. */
  readonly correlationId: string;
  /** Human-readable name for the operation (e.g. "simulate", "write"). */
  readonly name: string;
  /** Contract being invoked. */
  readonly contract: ContractName;
  /** Contract method being called. */
  readonly method: string;
  /** Wall-clock start time (ms since epoch). */
  readonly startedAt: number;
  /** Wall-clock finish time (ms since epoch). Set when span ends. */
  finishedAt?: number;
  /** Duration in ms. Set when span ends. */
  durationMs?: number;
  /** Whether the operation succeeded. */
  success?: boolean;
  /** Error message if the operation failed. */
  error?: string;
  /** Arbitrary key-value metadata attached to the span. */
  attributes: Record<string, string | number | boolean | null>;
}

/**
 * Hook called when a tracing span starts.
 */
export type OnSpanStart = (span: TraceSpan) => void;

/**
 * Hook called when a tracing span ends (success or failure).
 */
export type OnSpanEnd = (span: TraceSpan) => void;

/**
 * Tracing configuration supplied to `SorobanSdkCore`.
 */
export interface TracingConfig {
  /** Called synchronously when a new span is created. */
  readonly onSpanStart?: OnSpanStart;
  /** Called synchronously when a span finishes. */
  readonly onSpanEnd?: OnSpanEnd;
  /**
   * If true, the SDK generates a fresh `correlationId` per top-level call.
   * If false (default) the caller must supply one via `InvokeOptions`.
   */
  readonly autoCorrelation?: boolean;
}

export interface EventFilter {
  type?: "contract" | "system" | "diagnostic";
  contractIds?: string[];
  topics?: string[][];
}

export interface GetEventsOptions extends InvokeOptions {
  startLedger?: number;
  filters?: EventFilter[];
  cursor?: string;
  limit?: number;
}

export interface SorobanEvent {
  id: string;
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  contractId: string;
  topics: string[];
  value: string;
  inSuccessfulContractCall: boolean;
}

export interface StreamEventsOptions extends GetEventsOptions {
  /** Polling interval in milliseconds. Defaults to 5000. */
  pollInterval?: number;
}
