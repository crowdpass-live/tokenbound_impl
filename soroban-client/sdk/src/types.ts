import type { xdr } from "@stellar/stellar-sdk";

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
}

export interface InvokeOptions {
  readonly source?: string | null;
  readonly simulationSource?: string | null;
  readonly fee?: number;
  readonly timeoutInSeconds?: number;
}

export interface WriteInvokeOptions extends InvokeOptions {
  readonly signTransaction: SignTransactionFn;
}

export interface PreparedTransaction {
  readonly xdr: string;
  readonly networkPassphrase: string;
  readonly source: string;
}

export interface SorobanSubmitResult {
  readonly hash: string;
  readonly ledger: number;
  readonly status: string;
}

export type SignTransactionFn = (
  txXdr: string,
  options: { networkPassphrase: string; address: string }
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

export interface CreateEventLegacyInput extends Omit<CreateEventInput, "tiers"> {}

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
