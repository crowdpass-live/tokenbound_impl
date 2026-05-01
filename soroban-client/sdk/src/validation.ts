export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class TypeValidator {
  static isAddress(value: unknown): value is string {
    return typeof value === "string" && /^G[A-Z0-9]{55}$/.test(value);
  }

  static isBigInt(value: unknown): value is bigint {
    return typeof value === "bigint";
  }

  static isPositiveBigInt(value: unknown): value is bigint {
    return this.isBigInt(value) && value > 0n;
  }

  static isNonNegativeBigInt(value: unknown): value is bigint {
    return this.isBigInt(value) && value >= 0n;
  }

  static isNumber(value: unknown): value is number {
    return typeof value === "number" && !isNaN(value);
  }

  static isPositiveNumber(value: unknown): value is number {
    return this.isNumber(value) && value > 0;
  }

  static isNonNegativeNumber(value: unknown): value is number {
    return this.isNumber(value) && value >= 0;
  }

  static isString(value: unknown): value is string {
    return typeof value === "string";
  }

  static isNonEmptyString(value: unknown): value is string {
    return this.isString(value) && value.length > 0;
  }

  static isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
  }

  static isBytes32(value: unknown): value is string | Uint8Array {
    if (typeof value === "string") {
      return /^[0-9a-fA-F]{64}$/.test(value);
    }
    return value instanceof Uint8Array && value.length === 32;
  }

  static isArray<T>(
    value: unknown,
    itemValidator?: (item: unknown) => item is T,
  ): value is T[] {
    if (!Array.isArray(value)) return false;
    if (!itemValidator) return true;
    return value.every(itemValidator);
  }

  static validateAddress(
    value: unknown,
    fieldName: string,
  ): asserts value is string {
    if (!this.isAddress(value)) {
      throw new ValidationError(
        `${fieldName} must be a valid Stellar address (G...)`,
        fieldName,
        value,
      );
    }
  }

  static validateBigInt(
    value: unknown,
    fieldName: string,
  ): asserts value is bigint {
    if (!this.isBigInt(value)) {
      throw new ValidationError(
        `${fieldName} must be a bigint`,
        fieldName,
        value,
      );
    }
  }

  static validatePositiveBigInt(
    value: unknown,
    fieldName: string,
  ): asserts value is bigint {
    if (!this.isPositiveBigInt(value)) {
      throw new ValidationError(
        `${fieldName} must be a positive bigint`,
        fieldName,
        value,
      );
    }
  }

  static validateNumber(
    value: unknown,
    fieldName: string,
  ): asserts value is number {
    if (!this.isNumber(value)) {
      throw new ValidationError(
        `${fieldName} must be a number`,
        fieldName,
        value,
      );
    }
  }

  static validatePositiveNumber(
    value: unknown,
    fieldName: string,
  ): asserts value is number {
    if (!this.isPositiveNumber(value)) {
      throw new ValidationError(
        `${fieldName} must be a positive number`,
        fieldName,
        value,
      );
    }
  }

  static validateString(
    value: unknown,
    fieldName: string,
  ): asserts value is string {
    if (!this.isString(value)) {
      throw new ValidationError(
        `${fieldName} must be a string`,
        fieldName,
        value,
      );
    }
  }

  static validateNonEmptyString(
    value: unknown,
    fieldName: string,
  ): asserts value is string {
    if (!this.isNonEmptyString(value)) {
      throw new ValidationError(
        `${fieldName} must be a non-empty string`,
        fieldName,
        value,
      );
    }
  }

  static validateBoolean(
    value: unknown,
    fieldName: string,
  ): asserts value is boolean {
    if (!this.isBoolean(value)) {
      throw new ValidationError(
        `${fieldName} must be a boolean`,
        fieldName,
        value,
      );
    }
  }

  static validateBytes32(
    value: unknown,
    fieldName: string,
  ): asserts value is string | Uint8Array {
    if (!this.isBytes32(value)) {
      throw new ValidationError(
        `${fieldName} must be a 32-byte hex string or Uint8Array`,
        fieldName,
        value,
      );
    }
  }

  static validateArray<T>(
    value: unknown,
    fieldName: string,
    itemValidator?: (item: unknown) => item is T,
  ): asserts value is T[] {
    if (!this.isArray(value, itemValidator)) {
      throw new ValidationError(
        `${fieldName} must be an array`,
        fieldName,
        value,
      );
    }
  }

  static validateOptional<T>(
    value: unknown,
    validator: (val: unknown, field: string) => asserts val is T,
    fieldName: string,
  ): asserts value is T | null | undefined {
    if (value !== null && value !== undefined) {
      validator(value, fieldName);
    }
  }

  static validateRange(
    value: number | bigint,
    min: number | bigint,
    max: number | bigint,
    fieldName: string,
  ): void {
    if (value < min || value > max) {
      throw new ValidationError(
        `${fieldName} must be between ${min} and ${max}`,
        fieldName,
        value,
      );
    }
  }

  static validateEnum<T extends string>(
    value: unknown,
    allowedValues: readonly T[],
    fieldName: string,
  ): asserts value is T {
    if (!allowedValues.includes(value as T)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${allowedValues.join(", ")}`,
        fieldName,
        value,
      );
    }
  }
}

export function validateCreateEventInput(input: unknown): void {
  if (typeof input !== "object" || input === null) {
    throw new ValidationError("Input must be an object");
  }

  const obj = input as Record<string, unknown>;

  TypeValidator.validateAddress(obj.organizer, "organizer");
  TypeValidator.validateNonEmptyString(obj.theme, "theme");
  TypeValidator.validateNonEmptyString(obj.eventType, "eventType");
  TypeValidator.validatePositiveNumber(obj.startDate, "startDate");
  TypeValidator.validatePositiveNumber(obj.endDate, "endDate");
  TypeValidator.validatePositiveBigInt(obj.ticketPrice, "ticketPrice");
  TypeValidator.validatePositiveBigInt(obj.totalTickets, "totalTickets");
  TypeValidator.validateAddress(obj.paymentToken, "paymentToken");

  if (obj.startDate >= obj.endDate) {
    throw new ValidationError("startDate must be before endDate");
  }
}

export function validatePurchaseTicketInput(input: unknown): void {
  if (typeof input !== "object" || input === null) {
    throw new ValidationError("Input must be an object");
  }

  const obj = input as Record<string, unknown>;

  TypeValidator.validateAddress(obj.buyer, "buyer");
  TypeValidator.validateNonNegativeNumber(obj.eventId, "eventId");
  TypeValidator.validateOptional(
    obj.tierIndex,
    TypeValidator.validateNonNegativeNumber,
    "tierIndex",
  );
}
