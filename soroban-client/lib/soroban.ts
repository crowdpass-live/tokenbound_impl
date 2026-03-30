import { nativeToScVal, scValToNative } from "@stellar/stellar-base";
import { signTransaction } from "@stellar/freighter-api";

// Use require for the default export
const StellarSdk = require("@stellar/stellar-sdk");
const { Server, TransactionBuilder, Operation, SorobanRpc } = StellarSdk;

// Import Networks separately to avoid conflict
import { Networks } from "@stellar/stellar-sdk";

// Configuration helpers – prefer environment variables so they can be swapped
// for different networks (testnet / preview / mainnet) without changing code.
const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;
// contract ID of the deployed EventManager; set this in .env.local
const EVENT_MANAGER_CONTRACT =
  process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT || "<MISSING_CONTRACT_ID>";

export interface CreateEventParams {
  organizer: string; // wallet address
  theme: string;
  eventType: string;
  startTimeUnix: number;
  endTimeUnix: number;
  ticketPrice: bigint;
  totalTickets: bigint;
  paymentToken: string; // contract address for token used for payment
}

export type SignTransactionFn = (
  txXdr: string,
  options: { networkPassphrase: string; address: string }
) => Promise<string>;

export interface BuyTicketsParams {
  buyer: string;
  eventId: number;
  quantity: bigint;
}

export interface Event {
  id: number;
  theme: string;
  organizer: string;
  event_type: string;
  total_tickets: bigint;
  tickets_sold: bigint;
  ticket_price: bigint;
  start_date: number;
  end_date: number;
  is_canceled: boolean;
  ticket_nft_addr: string;
  payment_token: string;
}

export interface UpdateEventParams {
  organizer: string;
  event_id: number;
  theme?: string;
  ticket_price?: bigint;
  total_tickets?: bigint;
  start_date?: number;
  end_date?: number;
}

export function isEventManagerConfigured() {
  return EVENT_MANAGER_CONTRACT !== "<MISSING_CONTRACT_ID>";
}

/**
 * Builds, signs (via provider adapter) and submits a transaction to create a new
 * event using the EventManager Soroban contract.
 */
export async function createEvent(
  params: CreateEventParams,
  signTransactionFn: SignTransactionFn
) {
  if (!isEventManagerConfigured()) {
    throw new Error(
      "EVENT_MANAGER_CONTRACT is not configured. Set NEXT_PUBLIC_EVENT_MANAGER_CONTRACT in your env."
    );
  }

  const server = new Server(HORIZON_URL);

  // load account to obtain current sequence number
  const sourceAccount = await server.loadAccount(params.organizer);

  // use the standard base fee
  const fee = await server.fetchBaseFee();

  // prepare soroban arguments converting native JS values to ScVals
  const args = [
    nativeToScVal(params.organizer, { type: "address" }),
    nativeToScVal(params.theme, { type: "string" }),
    nativeToScVal(params.eventType, { type: "string" }),
    nativeToScVal(params.startTimeUnix, { type: "u64" }),
    nativeToScVal(params.endTimeUnix, { type: "u64" }),
    nativeToScVal(params.ticketPrice, { type: "i128" }),
    nativeToScVal(params.totalTickets, { type: "u128" }),
    nativeToScVal(params.paymentToken, { type: "address" }),
  ];

  const operation = Operation.invokeContractFunction({
    contract: EVENT_MANAGER_CONTRACT,
    function: "create_event",
    args,
  });

  const tx = new TransactionBuilder(sourceAccount, {
    fee: fee.toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const txXdr = tx.toXDR();

  // ask configured wallet provider to sign
  const signedTxXdr = await signTransactionFn(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: params.organizer,
  });

  // submit to horizon and return the result
  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  return await server.submitTransaction(signedTx as any);
}

export async function buyTickets(
  params: BuyTicketsParams,
  signTransactionFn: SignTransactionFn
) {
  if (!isEventManagerConfigured()) {
    throw new Error(
      "EVENT_MANAGER_CONTRACT is not configured. Set NEXT_PUBLIC_EVENT_MANAGER_CONTRACT in your env."
    );
  }

  const server = new Server(HORIZON_URL);
  const sourceAccount = await server.loadAccount(params.buyer);
  const fee = await server.fetchBaseFee();

  const args = [
    nativeToScVal(params.buyer, { type: "address" }),
    nativeToScVal(params.eventId, { type: "u32" }),
    nativeToScVal(params.quantity, { type: "u128" }),
  ];

  const operation = Operation.invokeContractFunction({
    contract: EVENT_MANAGER_CONTRACT,
    function: "purchase_tickets",
    args,
  });

  const tx = new TransactionBuilder(sourceAccount, {
    fee: fee.toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const txXdr = tx.toXDR();
  const signedTxXdr = await signTransactionFn(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: params.buyer,
  });

  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  return await server.submitTransaction(signedTx as any);
}

async function simulateAndInvoke(
  caller: string,
  functionName: string,
  args: ReturnType<typeof nativeToScVal>[]
) {
  const rpc = new SorobanRpc.Server(SOROBAN_RPC_URL);
  const server = new Server(HORIZON_URL);
  const sourceAccount = await server.loadAccount(caller);
  const fee = await server.fetchBaseFee();

  const operation = Operation.invokeContractFunction({
    contract: EVENT_MANAGER_CONTRACT,
    function: functionName,
    args,
  });

  const tx = new TransactionBuilder(sourceAccount, {
    fee: fee.toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const txXdr = tx.toXDR();
  const signedTxXdr = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: caller,
  });

  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  return await server.submitTransaction(signedTx as any);
}

/** Read all events from the contract (view call, no signing needed). */
export async function getAllEvents(): Promise<Event[]> {
  const rpc = new SorobanRpc.Server(SOROBAN_RPC_URL);

  const operation = Operation.invokeContractFunction({
    contract: EVENT_MANAGER_CONTRACT,
    function: "get_all_events",
    args: [],
  });

  const tx = new TransactionBuilder(
    { accountId: () => EVENT_MANAGER_CONTRACT, sequenceNumber: () => "0", incrementSequenceNumber: () => {} } as any,
    { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
  )
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const returnVal = (simResult as any).result?.retval;
  if (!returnVal) return [];

  const raw = scValToNative(returnVal) as any[];
  return raw.map((e: any) => ({
    id: Number(e.id),
    theme: e.theme,
    organizer: e.organizer,
    event_type: e.event_type,
    total_tickets: BigInt(e.total_tickets),
    tickets_sold: BigInt(e.tickets_sold),
    ticket_price: BigInt(e.ticket_price),
    start_date: Number(e.start_date),
    end_date: Number(e.end_date),
    is_canceled: e.is_canceled,
    ticket_nft_addr: e.ticket_nft_addr,
    payment_token: e.payment_token,
  }));
}

/** Cancel an event. Caller must be the organizer. */
export async function cancelEvent(organizer: string, eventId: number, signTransactionFn: SignTransactionFn) {
  return simulateAndInvoke(organizer, "cancel_event", [
    nativeToScVal(eventId, { type: "u32" }),
  ]);
}

/** Update event details. Caller must be the organizer. */
export async function updateEvent(params: UpdateEventParams, signTransactionFn: SignTransactionFn) {
  const toOption = (val: any, type: string) =>
    val !== undefined
      ? nativeToScVal({ Some: nativeToScVal(val, { type }) }, { type: "option" })
      : nativeToScVal(null, { type: "option" });

  return simulateAndInvoke(params.organizer, "update_event", [
    nativeToScVal(params.event_id, { type: "u32" }),
    toOption(params.theme, "string"),
    toOption(params.ticket_price, "i128"),
    toOption(params.total_tickets, "u128"),
    toOption(params.start_date, "u64"),
    toOption(params.end_date, "u64"),
  ]);
}

/** Claim funds after event completion. Caller must be the organizer. */
export async function claimFunds(organizer: string, eventId: number, signTransactionFn: SignTransactionFn) {
  return simulateAndInvoke(organizer, "withdraw_funds", [
    nativeToScVal(eventId, { type: "u32" }),
  ]);
}

/** Get attendees (buyers) for an event. */
export async function getEventAttendees(eventId: number, readerAccount: string): Promise<string[]> {
  const rpc = new SorobanRpc.Server(SOROBAN_RPC_URL);

  const operation = Operation.invokeContractFunction({
    contract: EVENT_MANAGER_CONTRACT,
    function: "get_event_buyers",
    args: [nativeToScVal(eventId, { type: "u32" })],
  });

  const tx = new TransactionBuilder(
    { accountId: () => readerAccount, sequenceNumber: () => "0", incrementSequenceNumber: () => {} } as any,
    { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
  )
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) return [];

  const returnVal = (simResult as any).result?.retval;
  if (!returnVal) return [];

  return scValToNative(returnVal) as string[];
}

/** Get balance of a user in a specific NFT contract. */
export async function getBalance(contractId: string, address: string): Promise<bigint> {
  const rpc = new SorobanRpc.Server(SOROBAN_RPC_URL);

  const operation = Operation.invokeContractFunction({
    contract: contractId,
    function: "balance_of",
    args: [nativeToScVal(address, { type: "address" })],
  });

  const tx = new TransactionBuilder(
    { accountId: () => address, sequenceNumber: () => "0", incrementSequenceNumber: () => {} } as any,
    { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
  )
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) return BigInt(0);

  const returnVal = (simResult as any).result?.retval;
  if (!returnVal) return BigInt(0);

  return BigInt(scValToNative(returnVal));
}

/** Get all tickets (events) a user owns. */
export async function getUserTickets(address: string): Promise<Event[]> {
  const allEvents = await getAllEvents();
  const results: Event[] = [];
  
  for (const event of allEvents) {
    if (!event.ticket_nft_addr || event.ticket_nft_addr === "") continue;
    try {
      const balance = await getBalance(event.ticket_nft_addr, address);
      if (balance > BigInt(0)) {
        results.push(event);
      }
    } catch (e) {
      console.error(`Error checking balance for ${event.id}:`, e);
    }
  }
  return results;
}

/** Get token ID for a user. */
export async function getTokenId(contractId: string, address: string): Promise<bigint> {
  const rpc = new SorobanRpc.Server(SOROBAN_RPC_URL);

  const operation = Operation.invokeContractFunction({
    contract: contractId,
    function: "get_token_id",
    args: [nativeToScVal(address, { type: "address" })],
  });

  const tx = new TransactionBuilder(
    { accountId: () => address, sequenceNumber: () => "0", incrementSequenceNumber: () => {} } as any,
    { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }
  )
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) return BigInt(0);

  const returnVal = (simResult as any).result?.retval;
  if (!returnVal) return BigInt(0);

  return BigInt(scValToNative(returnVal));
}
