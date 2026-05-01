export interface CheckInParams {
  organizer: string;
  eventId: number;
  tokenId: number;
}

export interface CheckInResult {
  success: boolean;
  timestamp: number;
  transactionHash: string;
}

export async function checkInEvent(params: CheckInParams): Promise<CheckInResult> {
  const EVENT_MANAGER_CONTRACT =
    process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT || "<MISSING_CONTRACT_ID>";
  const HORIZON_URL =
    process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
  const NETWORK_PASSPHRASE =
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

  if (!EVENT_MANAGER_CONTRACT || EVENT_MANAGER_CONTRACT === "<MISSING_CONTRACT_ID>") {
    throw new Error(
      "EVENT_MANAGER_CONTRACT is not configured. Set NEXT_PUBLIC_EVENT_MANAGER_CONTRACT in your env."
    );
  }

  const { Server, TransactionBuilder, Operation, Networks } = await import("@stellar/stellar-sdk");
  const { nativeToScVal } = await import("@stellar/stellar-base");
  const { signTransaction } = await import("@stellar/freighter-api");

  const server = new Server(HORIZON_URL);
  const sourceAccount = await server.loadAccount(params.organizer);
  const fee = await server.fetchBaseFee();

  const args = [
    nativeToScVal(params.eventId, { type: "u32" }),
    nativeToScVal(params.tokenId, { type: "u32" }),
  ];

  const operation = Operation.invokeContractFunction({
    contract: EVENT_MANAGER_CONTRACT,
    function: "check_in",
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
  const { signedTxXdr } = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: params.organizer,
  });

  const response = await server.submitTransaction(signedTxXdr);

  return {
    success: true,
    timestamp: Math.floor(Date.now() / 1000),
    transactionHash: response.hash,
  };
}

export async function verifyCheckIn(
  eventId: number,
  tokenId: number
): Promise<boolean> {
  const EVENT_MANAGER_CONTRACT =
    process.env.NEXT_PUBLIC_EVENT_MANAGER_CONTRACT || "<MISSING_CONTRACT_ID>";
  const HORIZON_URL =
    process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";

  if (!EVENT_MANAGER_CONTRACT || EVENT_MANAGER_CONTRACT === "<MISSING_CONTRACT_ID>") {
    throw new Error("EVENT_MANAGER_CONTRACT is not configured");
  }

  const server = new Server(HORIZON_URL);

  try {
    const result = await server.getContractEvents({
      contract: EVENT_MANAGER_CONTRACT,
      topic: [["check_in", eventId, tokenId]],
    });

    return result.events.length > 0;
  } catch {
    return false;
  }
}