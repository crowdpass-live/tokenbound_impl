import { nativeToScVal } from "@stellar/stellar-base";

import { SorobanSdkCore, toBytesScVal, toOptionScVal } from "./core";
import type {
  BuyerPurchase,
  ContractCallArtifact,
  CreateAccountInput,
  CreateEventInput,
  CreateEventLegacyInput,
  EventRecord,
  ExecuteTbaCallInput,
  InitializeTbaAccountInput,
  InvokeOptions,
  PurchaseTicketInput,
  PurchaseTicketsInput,
  TicketTier,
  UpdateEventInput,
  WriteInvokeOptions,
} from "./types";

function toTierConfigValue(
  tiers: readonly { name: string; price: bigint; totalQuantity: bigint }[]
) {
  return tiers.map((tier) => ({
    name: tier.name,
    price: tier.price,
    total_quantity: tier.totalQuantity,
  }));
}

function normalizeEvent(raw: Record<string, unknown>): EventRecord {
  return {
    id: Number(raw.id),
    theme: String(raw.theme),
    organizer: String(raw.organizer),
    eventType: String(raw.event_type),
    totalTickets: BigInt(String(raw.total_tickets)),
    ticketsSold: BigInt(String(raw.tickets_sold)),
    ticketPrice: BigInt(String(raw.ticket_price)),
    startDate: Number(raw.start_date),
    endDate: Number(raw.end_date),
    isCanceled: Boolean(raw.is_canceled),
    ticketNftAddress: String(raw.ticket_nft_addr),
    paymentToken: String(raw.payment_token),
  };
}

function normalizeTier(raw: Record<string, unknown>): TicketTier {
  return {
    name: String(raw.name),
    price: BigInt(String(raw.price)),
    totalQuantity: BigInt(String(raw.total_quantity)),
    soldQuantity: BigInt(String(raw.sold_quantity)),
  };
}

function normalizePurchase(
  raw: Record<string, unknown> | null | undefined
): BuyerPurchase | null {
  if (!raw) {
    return null;
  }
  return {
    quantity: BigInt(String(raw.quantity)),
    totalPaid: BigInt(String(raw.total_paid)),
  };
}

abstract class BaseContract {
  protected readonly core: SorobanSdkCore;
  protected readonly contractName:
    | "eventManager"
    | "ticketFactory"
    | "ticketNft"
    | "tbaRegistry"
    | "tbaAccount";

  protected constructor(core: SorobanSdkCore, contractName: BaseContract["contractName"]) {
    this.core = core;
    this.contractName = contractName;
  }

  get contractId() {
    return this.core.getContractId(this.contractName);
  }

  protected artifact(
    method: string,
    args: readonly ReturnType<typeof nativeToScVal>[]
  ): ContractCallArtifact {
    return {
      contractId: this.contractId,
      method,
      args,
    };
  }

  protected read<T>(
    method: string,
    args: readonly ReturnType<typeof nativeToScVal>[],
    options?: InvokeOptions
  ) {
    return this.core.read<T>(this.contractName, this.artifact(method, args), options);
  }

  protected write(
    method: string,
    args: readonly ReturnType<typeof nativeToScVal>[],
    options: WriteInvokeOptions
  ) {
    return this.core.write(this.contractName, this.artifact(method, args), options);
  }

  prepare(
    method: string,
    args: readonly ReturnType<typeof nativeToScVal>[],
    options: WriteInvokeOptions
  ) {
    return this.core.prepareWrite(this.contractName, this.artifact(method, args), options);
  }
}

export class EventManagerContract extends BaseContract {
  constructor(core: SorobanSdkCore) {
    super(core, "eventManager");
  }

  initialize(ticketFactory: string, options: WriteInvokeOptions) {
    return this.write("initialize", [nativeToScVal(ticketFactory, { type: "address" })], options);
  }

  createEvent(input: CreateEventInput, options: WriteInvokeOptions) {
    return this.createEventLegacy(input, options);
  }

  createEventLegacy(input: CreateEventLegacyInput, options: WriteInvokeOptions) {
    return this.write(
      "create_event",
      [
        nativeToScVal(input.organizer, { type: "address" }),
        nativeToScVal(input.theme, { type: "string" }),
        nativeToScVal(input.eventType, { type: "string" }),
        nativeToScVal(input.startDate, { type: "u64" }),
        nativeToScVal(input.endDate, { type: "u64" }),
        nativeToScVal(input.ticketPrice, { type: "i128" }),
        nativeToScVal(input.totalTickets, { type: "u128" }),
        nativeToScVal(input.paymentToken, { type: "address" }),
      ],
      options
    );
  }

  createEventWithParams(input: CreateEventInput, options: WriteInvokeOptions) {
    const payload = {
      organizer: input.organizer,
      theme: input.theme,
      event_type: input.eventType,
      start_date: input.startDate,
      end_date: input.endDate,
      ticket_price: input.ticketPrice,
      total_tickets: input.totalTickets,
      payment_token: input.paymentToken,
      tiers: toTierConfigValue(input.tiers ?? []),
    };
    return this.write("create_event", [nativeToScVal(payload)], options);
  }

  async getEvent(eventId: number, options?: InvokeOptions): Promise<EventRecord> {
    const raw = await this.read<Record<string, unknown>>(
      "get_event",
      [nativeToScVal(eventId, { type: "u32" })],
      options
    );
    return normalizeEvent(raw);
  }

  async getEventTiers(eventId: number, options?: InvokeOptions): Promise<TicketTier[]> {
    const raw = await this.read<Array<Record<string, unknown>>>(
      "get_event_tiers",
      [nativeToScVal(eventId, { type: "u32" })],
      options
    );
    return raw.map(normalizeTier);
  }

  getEventCount(options?: InvokeOptions) {
    return this.read<number>("get_event_count", [], options);
  }

  async getAllEvents(options?: InvokeOptions): Promise<EventRecord[]> {
    const raw = await this.read<Array<Record<string, unknown>>>("get_all_events", [], options);
    return raw.map(normalizeEvent);
  }

  async getBuyerPurchase(eventId: number, buyer: string, options?: InvokeOptions) {
    const raw = await this.read<Record<string, unknown> | null>(
      "get_buyer_purchase",
      [
        nativeToScVal(eventId, { type: "u32" }),
        nativeToScVal(buyer, { type: "address" }),
      ],
      options
    );
    return normalizePurchase(raw);
  }

  cancelEvent(eventId: number, options: WriteInvokeOptions) {
    return this.write("cancel_event", [nativeToScVal(eventId, { type: "u32" })], options);
  }

  claimRefund(claimer: string, eventId: number, options: WriteInvokeOptions) {
    return this.write(
      "claim_refund",
      [
        nativeToScVal(claimer, { type: "address" }),
        nativeToScVal(eventId, { type: "u32" }),
      ],
      options
    );
  }

  updateEvent(input: UpdateEventInput, options: WriteInvokeOptions) {
    return this.write(
      "update_event",
      [
        nativeToScVal(input.eventId, { type: "u32" }),
        toOptionScVal(input.theme, "string"),
        toOptionScVal(input.ticketPrice, "i128"),
        toOptionScVal(input.totalTickets, "u128"),
        toOptionScVal(input.startDate, "u64"),
        toOptionScVal(input.endDate, "u64"),
      ],
      options
    );
  }

  updateTicketsSold(eventId: number, amount: bigint, options: WriteInvokeOptions) {
    return this.write(
      "update_tickets_sold",
      [
        nativeToScVal(eventId, { type: "u32" }),
        nativeToScVal(amount, { type: "u128" }),
      ],
      options
    );
  }

  purchaseTicket(input: PurchaseTicketInput, options: WriteInvokeOptions) {
    return this.write(
      "purchase_ticket",
      [
        nativeToScVal(input.buyer, { type: "address" }),
        nativeToScVal(input.eventId, { type: "u32" }),
        nativeToScVal(input.tierIndex ?? 0, { type: "u32" }),
      ],
      options
    );
  }

  purchaseTickets(input: PurchaseTicketsInput, options: WriteInvokeOptions) {
    return this.write(
      "purchase_tickets",
      [
        nativeToScVal(input.buyer, { type: "address" }),
        nativeToScVal(input.eventId, { type: "u32" }),
        nativeToScVal(input.quantity, { type: "u128" }),
      ],
      options
    );
  }

  withdrawFunds(eventId: number, options: WriteInvokeOptions) {
    return this.write("withdraw_funds", [nativeToScVal(eventId, { type: "u32" })], options);
  }

  getEventBuyers(eventId: number, options?: InvokeOptions) {
    return this.read<string[]>(
      "get_event_buyers",
      [nativeToScVal(eventId, { type: "u32" })],
      options
    );
  }
}

export class TicketFactoryContract extends BaseContract {
  constructor(core: SorobanSdkCore) {
    super(core, "ticketFactory");
  }

  deployTicket(minter: string, salt: string | Uint8Array, options: WriteInvokeOptions) {
    return this.write(
      "deploy_ticket",
      [nativeToScVal(minter, { type: "address" }), toBytesScVal(salt)],
      options
    );
  }

  getTicketContract(eventId: number, options?: InvokeOptions) {
    return this.read<string | null>(
      "get_ticket_contract",
      [nativeToScVal(eventId, { type: "u32" })],
      options
    );
  }

  getTotalTickets(options?: InvokeOptions) {
    return this.read<number>("get_total_tickets", [], options);
  }

  getAdmin(options?: InvokeOptions) {
    return this.read<string>("get_admin", [], options);
  }
}

export class TicketNftContract extends BaseContract {
  constructor(core: SorobanSdkCore) {
    super(core, "ticketNft");
  }

  mintTicket(recipient: string, options: WriteInvokeOptions) {
    return this.write("mint_ticket_nft", [nativeToScVal(recipient, { type: "address" })], options);
  }

  ownerOf(tokenId: bigint, options?: InvokeOptions) {
    return this.read<string>("owner_of", [nativeToScVal(tokenId, { type: "u128" })], options);
  }

  balanceOf(owner: string, options?: InvokeOptions) {
    return this.read<bigint>("balance_of", [nativeToScVal(owner, { type: "address" })], options);
  }

  transferFrom(from: string, to: string, tokenId: bigint, options: WriteInvokeOptions) {
    return this.write(
      "transfer_from",
      [
        nativeToScVal(from, { type: "address" }),
        nativeToScVal(to, { type: "address" }),
        nativeToScVal(tokenId, { type: "u128" }),
      ],
      options
    );
  }

  burn(tokenId: bigint, options: WriteInvokeOptions) {
    return this.write("burn", [nativeToScVal(tokenId, { type: "u128" })], options);
  }

  isValid(tokenId: bigint, options?: InvokeOptions) {
    return this.read<boolean>("is_valid", [nativeToScVal(tokenId, { type: "u128" })], options);
  }

  getMinter(options?: InvokeOptions) {
    return this.read<string>("get_minter", [], options);
  }
}

export class TbaRegistryContract extends BaseContract {
  constructor(core: SorobanSdkCore) {
    super(core, "tbaRegistry");
  }

  getAccount(input: CreateAccountInput, options?: InvokeOptions) {
    return this.read<string>(
      "get_account",
      [
        toBytesScVal(input.implementationHash),
        nativeToScVal(input.tokenContract, { type: "address" }),
        nativeToScVal(input.tokenId, { type: "u128" }),
        toBytesScVal(input.salt),
      ],
      options
    );
  }

  createAccount(input: CreateAccountInput, options: WriteInvokeOptions) {
    return this.write(
      "create_account",
      [
        toBytesScVal(input.implementationHash),
        nativeToScVal(input.tokenContract, { type: "address" }),
        nativeToScVal(input.tokenId, { type: "u128" }),
        toBytesScVal(input.salt),
      ],
      options
    );
  }

  totalDeployedAccounts(tokenContract: string, tokenId: bigint, options?: InvokeOptions) {
    return this.read<number>(
      "total_deployed_accounts",
      [
        nativeToScVal(tokenContract, { type: "address" }),
        nativeToScVal(tokenId, { type: "u128" }),
      ],
      options
    );
  }

  getDeployedAddress(input: CreateAccountInput, options?: InvokeOptions) {
    return this.read<string | null>(
      "get_deployed_address",
      [
        toBytesScVal(input.implementationHash),
        nativeToScVal(input.tokenContract, { type: "address" }),
        nativeToScVal(input.tokenId, { type: "u128" }),
        toBytesScVal(input.salt),
      ],
      options
    );
  }
}

export class TbaAccountContract extends BaseContract {
  constructor(core: SorobanSdkCore) {
    super(core, "tbaAccount");
  }

  initialize(input: InitializeTbaAccountInput, options: WriteInvokeOptions) {
    return this.write(
      "initialize",
      [
        nativeToScVal(input.tokenContract, { type: "address" }),
        nativeToScVal(input.tokenId, { type: "u128" }),
        toBytesScVal(input.implementationHash),
        toBytesScVal(input.salt),
      ],
      options
    );
  }

  tokenContract(options?: InvokeOptions) {
    return this.read<string>("token_contract", [], options);
  }

  tokenId(options?: InvokeOptions) {
    return this.read<bigint>("token_id", [], options);
  }

  owner(options?: InvokeOptions) {
    return this.read<string>("owner", [], options);
  }

  token(options?: InvokeOptions) {
    return this.read<[number, string, bigint]>("token", [], options);
  }

  nonce(options?: InvokeOptions) {
    return this.read<number>("nonce", [], options);
  }

  execute(input: ExecuteTbaCallInput, options: WriteInvokeOptions) {
    return this.write(
      "execute",
      [
        nativeToScVal(input.to, { type: "address" }),
        nativeToScVal(input.func, { type: "symbol" }),
        nativeToScVal(input.args ?? [], { type: "vec" }),
      ],
      options
    );
  }
}
