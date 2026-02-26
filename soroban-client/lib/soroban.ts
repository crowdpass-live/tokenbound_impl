import StellarSdk from "@stellar/stellar-sdk";
import { nativeToScVal } from "@stellar/stellar-base";
import { signTransaction } from "@stellar/freighter-api";

// "@stellar/stellar-sdk" has a default export that bundles several
// constructors; we pull out the pieces we need for clarity.
const { Server, TransactionBuilder, Operation, Networks } = StellarSdk;

// Configuration helpers – prefer environment variables so they can be swapped
// for different networks (testnet / preview / mainnet) without changing code.
const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || Networks.TESTNET;
// contract ID of the deployed EventManager; set this in .env.local
const EVENT_MANAGER_CONTRACT =
  process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT || "<MISSING_CONTRACT_ID>";

export interface CreateEventParams {
  organizer: string; // freighter address
  theme: string;
  eventType: string;
  startTimeUnix: number;
  endTimeUnix: number;
  ticketPrice: bigint;
  totalTickets: bigint;
  paymentToken: string; // contract address for token used for payment
}

/**
 * Builds, signs (via Freighter) and submits a transaction to create a new
 * event using the EventManager Soroban contract.
 *
 * The caller must have a Freighter wallet connected and the supplied
 * `organizer` address must match the source account in the wallet.
 */
export async function createEvent(params: CreateEventParams) {
  if (EVENT_MANAGER_CONTRACT === "<MISSING_CONTRACT_ID>") {
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

  // ask Freighter to sign
  const { signedTxXdr } = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: params.organizer,
  });

  // submit to horizon and return the result
  return await server.submitTransaction(signedTxXdr);
}
