import { GENERATED_CONTRACT_SPECS } from "./generated/contracts";
import type { ContractName } from "./types";

export interface DecodedContractError {
  readonly contract: ContractName;
  readonly code: number;
  readonly name: string;
  readonly message: string;
}

export class SorobanContractError extends Error {
  readonly contract: ContractName;
  readonly code: number;
  readonly shortName: string;

  constructor(details: DecodedContractError, cause?: unknown) {
    super(details.message);
    this.name = "SorobanContractError";
    this.contract = details.contract;
    this.code = details.code;
    this.shortName = details.name;
    if (cause !== undefined) {
      Object.defineProperty(this, "cause", {
        configurable: true,
        enumerable: false,
        value: cause,
      });
    }
  }
}

function toSentenceCase(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

export function decodeContractError(
  contract: ContractName,
  input: string
): DecodedContractError | null {
  const match = input.match(/Error\(Contract,\s*#(\d+)\)/);
  if (!match) {
    return null;
  }

  const code = Number(match[1]);
  const spec = GENERATED_CONTRACT_SPECS[contract];
  const known = spec.errors.find((error) => error.code === code);

  return {
    contract,
    code,
    name: known?.name ?? "UnknownContractError",
    message: known
      ? `${contract} contract error ${code}: ${toSentenceCase(known.name)}`
      : `${contract} contract error ${code}`,
  };
}

export function mapSdkError(
  contract: ContractName,
  error: unknown,
  fallbackMessage: string
): Error {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : fallbackMessage;
  const decoded = decodeContractError(contract, message);
  if (decoded) {
    return new SorobanContractError(decoded, error);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(message);
}
