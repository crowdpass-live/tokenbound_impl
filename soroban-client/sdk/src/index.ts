import { SorobanSdkCore } from "./core";
import {
  EventManagerContract,
  TbaAccountContract,
  TbaRegistryContract,
  TicketFactoryContract,
  TicketNftContract,
} from "./contracts";
import { GENERATED_CONTRACT_SPECS } from "./generated/contracts";
import type { TokenboundSdkConfig } from "./types";

export * from "./contracts";
export * from "./core";
export * from "./errors";
export * from "./generated/contracts";
export * from "./types";

export class TokenboundSdk extends SorobanSdkCore {
  readonly eventManager: EventManagerContract;
  readonly ticketFactory: TicketFactoryContract;
  readonly ticketNft: TicketNftContract;
  readonly tbaRegistry: TbaRegistryContract;
  readonly tbaAccount: TbaAccountContract;
  readonly generated = GENERATED_CONTRACT_SPECS;

  constructor(config: TokenboundSdkConfig) {
    super(config);
    this.eventManager = new EventManagerContract(this);
    this.ticketFactory = new TicketFactoryContract(this);
    this.ticketNft = new TicketNftContract(this);
    this.tbaRegistry = new TbaRegistryContract(this);
    this.tbaAccount = new TbaAccountContract(this);
  }
}

export function createTokenboundSdk(config: TokenboundSdkConfig) {
  return new TokenboundSdk(config);
}
