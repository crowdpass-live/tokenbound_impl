/**
 * Base class for all Soroban-related errors.
 */
export class SorobanError extends Error {
  constructor(
    message: string,
    public readonly category: SorobanErrorCategory,
    public readonly originalError?: any,
  ) {
    super(message);
    this.name = "SorobanError";
  }
}

export enum SorobanErrorCategory {
  NETWORK = "NETWORK",
  SIMULATION = "SIMULATION",
  TRANSACTION = "TRANSACTION",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  UNSUPPORTED_PROTOCOL = "UNSUPPORTED_PROTOCOL",
  UNKNOWN = "UNKNOWN",
}

/**
 * Maps low-level RPC and transaction errors to consistent typed error categories.
 */
export function classifyError(error: any): SorobanError {
  if (error instanceof SorobanError) return error;

  const message = error?.message || "An unknown error occurred";
  
  if (message.includes("404") || message.includes("not found")) {
    return new SorobanError(
      "Source account not found on the network.",
      SorobanErrorCategory.ACCOUNT_NOT_FOUND,
      error,
    );
  }

  if (message.includes("simulation failed") || message.includes("SimulationError")) {
    return new SorobanError(
      `Transaction simulation failed: ${message}`,
      SorobanErrorCategory.SIMULATION,
      error,
    );
  }

  if (message.includes("insufficient") || message.includes("underfunded")) {
    return new SorobanError(
      "Insufficient funds to cover transaction fees.",
      SorobanErrorCategory.INSUFFICIENT_FUNDS,
      error,
    );
  }

  if (message.includes("network") || message.includes("fetch") || message.includes("ENOTFOUND")) {
    return new SorobanError(
      "Network connectivity issue. Please check your internet connection.",
      SorobanErrorCategory.NETWORK,
      error,
    );
  }

  return new SorobanError(message, SorobanErrorCategory.UNKNOWN, error);
}

/**
 * Formats a SorobanError into a user-friendly message.
 */
export function getUserFriendlyMessage(error: any): string {
  const classified = classifyError(error);
  switch (classified.category) {
    case SorobanErrorCategory.ACCOUNT_NOT_FOUND:
      return "Your wallet account was not found on the network. Please fund it with some XLM.";
    case SorobanErrorCategory.INSUFFICIENT_FUNDS:
      return "You don't have enough XLM to pay for the transaction fees.";
    case SorobanErrorCategory.SIMULATION:
      return "The transaction would fail if submitted. This might be due to incorrect parameters or insufficient contract balance.";
    case SorobanErrorCategory.NETWORK:
      return "Could not connect to the Soroban network. Please try again later.";
    default:
      return classified.message;
  }
}
