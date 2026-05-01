/**
 * Event Parser for Soroban Contract Events
 *
 * This module provides utilities for parsing and decoding Soroban contract event logs,
 * making it easier for developers to consume and work with contract events.
 */

import { scValToNative, xdr } from "@stellar/stellar-sdk";

/**
 * Represents a parsed Soroban contract event
 */
export interface ParsedEvent {
  /** Event topic/name */
  topic: string;
  /** Event data */
  data: Record<string, unknown>;
  /** Raw event topics */
  topics: string[];
  /** Raw event value */
  value: unknown;
}

/**
 * Event parsing error
 */
export class EventParseError extends Error {
  constructor(
    message: string,
    public readonly rawEvent: unknown,
    public readonly reason: string,
  ) {
    super(message);
    this.name = "EventParseError";
  }
}

/**
 * Result type for event parsing operations
 */
export type EventParseResult<T> =
  | { success: true; event: T }
  | { success: false; error: EventParseError };

/**
 * Parse a single Soroban contract event
 *
 * @param event - The raw event from the contract
 * @returns ParsedEvent with structured data
 * @throws EventParseError if parsing fails
 */
export function parseEvent(event: unknown): ParsedEvent {
  if (!isValidEvent(event)) {
    throw new EventParseError(
      "Invalid event structure",
      event,
      "Event must have topics and value properties",
    );
  }

  const eventObj = event as Record<string, unknown>;
  const topics = extractTopics(eventObj);
  const topic = extractTopic(topics);

  try {
    const value = eventObj.value;
    const data = decodeEventData(value, topics);

    return {
      topic,
      data,
      topics,
      value,
    };
  } catch (error) {
    throw new EventParseError(
      `Failed to parse event: ${error instanceof Error ? error.message : String(error)}`,
      event,
      "Error during event data decoding",
    );
  }
}

/**
 * Safely parse a Soroban contract event
 *
 * @param event - The raw event from the contract
 * @returns Result with parsed event or error
 */
export function safeParseEvent(event: unknown): EventParseResult<ParsedEvent> {
  try {
    return {
      success: true,
      event: parseEvent(event),
    };
  } catch (error) {
    if (error instanceof EventParseError) {
      return {
        success: false,
        error,
      };
    }
    return {
      success: false,
      error: new EventParseError(
        error instanceof Error ? error.message : String(error),
        event,
        "Unknown error during parsing",
      ),
    };
  }
}

/**
 * Parse multiple contract events
 *
 * @param events - Array of raw events from contract
 * @returns Array of parsed events
 */
export function parseEvents(events: unknown[]): ParsedEvent[] {
  if (!Array.isArray(events)) {
    throw new EventParseError(
      "Expected array of events",
      events,
      "Input must be an array",
    );
  }

  return events.map((event) => parseEvent(event));
}

/**
 * Safely parse multiple contract events
 *
 * @param events - Array of raw events from contract
 * @returns Result with parsed events or error
 */
export function safeParseEvents(
  events: unknown[],
): EventParseResult<ParsedEvent[]> {
  try {
    return {
      success: true,
      event: parseEvents(events),
    };
  } catch (error) {
    if (error instanceof EventParseError) {
      return {
        success: false,
        error,
      };
    }
    return {
      success: false,
      error: new EventParseError(
        error instanceof Error ? error.message : String(error),
        events,
        "Unknown error during parsing",
      ),
    };
  }
}

/**
 * Filter parsed events by topic
 *
 * @param events - Array of parsed events
 * @param topic - Topic to filter by
 * @returns Filtered events matching the topic
 */
export function filterEventsByTopic(
  events: ParsedEvent[],
  topic: string,
): ParsedEvent[] {
  return events.filter((event) => event.topic === topic);
}

/**
 * Parse Transfer events
 *
 * @param events - Array of parsed events
 * @returns Parsed transfer events
 */
export function parseTransferEvents(
  events: ParsedEvent[],
): TransferEvent[] {
  return filterEventsByTopic(events, "transfer")
    .map((event) => ({
      from: extractAddress(event.data.from),
      to: extractAddress(event.data.to),
      tokenId: extractU128(event.data.token_id),
    }))
    .filter((e) => e.from !== null && e.to !== null && e.tokenId !== null) as TransferEvent[];
}

/**
 * Parse Approval events
 *
 * @param events - Array of parsed events
 * @returns Parsed approval events
 */
export function parseApprovalEvents(
  events: ParsedEvent[],
): ApprovalEvent[] {
  return filterEventsByTopic(events, "approve")
    .map((event) => ({
      owner: extractAddress(event.data.owner),
      approved: extractAddress(event.data.approved),
      tokenId: extractU128(event.data.token_id),
    }))
    .filter((e) => e.owner !== null && e.approved !== null && e.tokenId !== null) as ApprovalEvent[];
}

/**
 * Parse ApprovalForAll events
 *
 * @param events - Array of parsed events
 * @returns Parsed approval for all events
 */
export function parseApprovalForAllEvents(
  events: ParsedEvent[],
): ApprovalForAllEvent[] {
  return filterEventsByTopic(events, "apprvall")
    .map((event) => ({
      owner: extractAddress(event.data.owner),
      operator: extractAddress(event.data.operator),
      approved: extractBoolean(event.data.approved),
    }))
    .filter((e) => e.owner !== null && e.operator !== null && e.approved !== null) as ApprovalForAllEvent[];
}

/**
 * Transfer event interface
 */
export interface TransferEvent {
  from: string | null;
  to: string | null;
  tokenId: number | null;
}

/**
 * Approval event interface
 */
export interface ApprovalEvent {
  owner: string | null;
  approved: string | null;
  tokenId: number | null;
}

/**
 * ApprovalForAll event interface
 */
export interface ApprovalForAllEvent {
  owner: string | null;
  operator: string | null;
  approved: boolean | null;
}

// ============ Helper Functions ============

/**
 * Check if event has valid structure
 */
function isValidEvent(event: unknown): boolean {
  if (typeof event !== "object" || event === null) {
    return false;
  }

  const eventObj = event as Record<string, unknown>;
  return "topics" in eventObj && "value" in eventObj;
}

/**
 * Extract topics array from event
 */
function extractTopics(event: Record<string, unknown>): string[] {
  const topics = event.topics;
  if (Array.isArray(topics)) {
    return topics.map((t) => String(t));
  }
  return [];
}

/**
 * Extract main topic name from topics array
 */
function extractTopic(topics: string[]): string {
  if (topics.length === 0) {
    return "unknown";
  }
  // The first topic is typically the event name/signature
  return topics[0];
}

/**
 * Decode event data from raw value
 */
function decodeEventData(
  value: unknown,
  _topics: string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const valueObj = value as Record<string, unknown>;

  // Try to convert using scValToNative if it's an XDR value
  try {
    if (valueObj.type === "xdr" || valueObj.type === "object") {
      return scValToNative(valueObj as xdr.ScVal);
    }
  } catch {
    // If XDR conversion fails, fall through to direct conversion
  }

  // Direct conversion for already decoded values
  return flattenObject(valueObj);
}

/**
 * Flatten nested object for easier access
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }

  return result;
}

/**
 * Extract address from event data
 */
function extractAddress(data: unknown): string | null {
  if (typeof data === "string") {
    return data;
  }
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if ("address" in obj) {
      return String(obj.address);
    }
  }
  return null;
}

/**
 * Extract u128 number from event data
 */
function extractU128(data: unknown): number | null {
  if (typeof data === "number") {
    return data;
  }
  if (typeof data === "string") {
    const parsed = Number(data);
    return isNaN(parsed) ? null : parsed;
  }
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if ("low" in obj && "high" in obj) {
      // Handle BigInt representation if needed
      return Number(obj.low);
    }
  }
  return null;
}

/**
 * Extract boolean from event data
 */
function extractBoolean(data: unknown): boolean | null {
  if (typeof data === "boolean") {
    return data;
  }
  if (typeof data === "string") {
    return data.toLowerCase() === "true" || data === "1";
  }
  if (typeof data === "number") {
    return data !== 0;
  }
  return null;
}
