export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export function createPaginationParams(
  cursor?: string,
  limit: number = 10
): PaginationParams {
  return {
    cursor,
    limit: Math.min(Math.max(1, limit), 100),
  };
}

export function parsePaginationResponse<T>(
  data: T[],
  total?: number
): PaginatedResult<T> {
  return {
    data,
    nextCursor: data.length > 0 ? encodeCursor(data[data.length - 1]) : null,
    hasMore: data.length > 0,
    total,
  };
}

function encodeCursor(item: unknown): string {
  return Buffer.from(JSON.stringify(item)).toString("base64");
}

export function decodeCursor<T>(cursor: string): T | null {
  try {
    return JSON.parse(Buffer.from(cursor, "base64").toString()) as T;
  } catch {
    return null;
  }
}