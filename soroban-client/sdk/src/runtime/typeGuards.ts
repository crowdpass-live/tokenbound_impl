export function isEventRecord(value: unknown): value is {
  id: number;
  theme: string;
  organizer: string;
  eventType: string;
  totalTickets: bigint;
  ticketsSold: bigint;
  ticketPrice: bigint;
  startDate: number;
  endDate: number;
  isCanceled: boolean;
  ticketNftAddress: string;
  paymentToken: string;
} {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === "number" &&
    typeof obj.theme === "string" &&
    typeof obj.organizer === "string" &&
    typeof obj.eventType === "string" &&
    typeof obj.totalTickets === "bigint" &&
    typeof obj.ticketsSold === "bigint" &&
    typeof obj.ticketPrice === "bigint" &&
    typeof obj.startDate === "number" &&
    typeof obj.endDate === "number" &&
    typeof obj.isCanceled === "boolean" &&
    typeof obj.ticketNftAddress === "string" &&
    typeof obj.paymentToken === "string"
  );
}

export function isTicketTier(value: unknown): value is {
  name: string;
  price: bigint;
  totalQuantity: bigint;
  soldQuantity: bigint;
} {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj.name === "string" &&
    typeof obj.price === "bigint" &&
    typeof obj.totalQuantity === "bigint" &&
    typeof obj.soldQuantity === "bigint"
  );
}

export function isBuyerPurchase(value: unknown): value is {
  quantity: bigint;
  totalPaid: bigint;
} {
  if (typeof value !== "object" || value === null) return false;

  const obj = value as Record<string, unknown>;

  return typeof obj.quantity === "bigint" && typeof obj.totalPaid === "bigint";
}

export function assertEventRecord(value: unknown): asserts value is {
  id: number;
  theme: string;
  organizer: string;
  eventType: string;
  totalTickets: bigint;
  ticketsSold: bigint;
  ticketPrice: bigint;
  startDate: number;
  endDate: number;
  isCanceled: boolean;
  ticketNftAddress: string;
  paymentToken: string;
} {
  if (!isEventRecord(value)) {
    throw new TypeError("Value is not a valid EventRecord");
  }
}

export function assertTicketTier(value: unknown): asserts value is {
  name: string;
  price: bigint;
  totalQuantity: bigint;
  soldQuantity: bigint;
} {
  if (!isTicketTier(value)) {
    throw new TypeError("Value is not a valid TicketTier");
  }
}

export function assertBuyerPurchase(value: unknown): asserts value is {
  quantity: bigint;
  totalPaid: bigint;
} {
  if (!isBuyerPurchase(value)) {
    throw new TypeError("Value is not a valid BuyerPurchase");
  }
}

export function assertArray<T>(
  value: unknown,
  itemGuard: (item: unknown) => item is T,
): asserts value is T[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Value is not an array");
  }

  for (let i = 0; i < value.length; i++) {
    if (!itemGuard(value[i])) {
      throw new TypeError(`Array item at index ${i} failed type guard`);
    }
  }
}
