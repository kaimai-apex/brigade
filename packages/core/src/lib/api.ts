import type { Pool, PoolClient } from "pg";
import { ServiceError } from "../services/base_service.ts";

/**
 * The HTTP-facing conventions: one error shape, cursor pagination, rate limits.
 *
 * These live in the core rather than in route handlers so that every endpoint
 * gets them identically. An error shape that varies by endpoint forces the
 * client to write a parser per call site.
 */

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type ApiErrorBody = {
  error: string;
  error_description: string;
  details?: Record<string, string[]>;
  request_id: string;
};

/**
 * Never leak internals in `error`. The stack trace is logged against the
 * request id; the client gets the id so support can correlate a report with a
 * log line without the user pasting a stack trace.
 */
export function toApiError(error: unknown, requestId: string): {
  status: number;
  body: ApiErrorBody;
} {
  if (error instanceof ServiceError) {
    return {
      status: error.status,
      body: {
        error: error.code,
        error_description: error.message,
        ...(error.details ? { details: error.details } : {}),
        request_id: requestId,
      },
    };
  }

  console.error("[api] unhandled", { requestId, error });
  return {
    status: 500,
    body: {
      error: "internal_error",
      error_description: "Something went wrong on our side.",
      request_id: requestId,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Cursor pagination                                                   */
/* ------------------------------------------------------------------ */

export type CursorParams = { maxId?: string; minId?: string; sinceId?: string; limit?: number };

/**
 * Offset pagination on a live collection produces duplicates and gaps as new
 * items arrive, and `OFFSET 10000` is a sequential scan. Snowflake ids sort by
 * time, so an id cursor is both stable and cheap.
 *
 * Returns a fragment to AND into a WHERE clause plus the ordering direction —
 * `sinceId` walks forward from a known point, so it has to sort ascending or it
 * returns the newest page rather than the next one.
 */
export function cursorClause(
  params: CursorParams,
  column = "id",
  startAt = 0,
): { where: string; values: unknown[]; order: "ASC" | "DESC"; limit: number } {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let order: "ASC" | "DESC" = "DESC";

  if (params.maxId) {
    values.push(params.maxId);
    conditions.push(`${column} < $${startAt + values.length}`);
  }
  if (params.sinceId) {
    values.push(params.sinceId);
    conditions.push(`${column} > $${startAt + values.length}`);
  }
  if (params.minId) {
    values.push(params.minId);
    conditions.push(`${column} > $${startAt + values.length}`);
    order = "ASC";
  }

  return {
    where: conditions.length ? conditions.join(" AND ") : "TRUE",
    values,
    order,
    limit: Math.min(Math.max(params.limit ?? 20, 1), 40),
  };
}

/**
 * Build the RFC 8288 Link header. Clients follow these rather than
 * constructing cursors themselves, which is what lets the cursor scheme change
 * without breaking every client.
 */
export function linkHeader(
  baseUrl: string,
  items: { id: string }[],
  limit: number,
): string | null {
  if (items.length === 0) return null;

  const ids = items.map((i) => BigInt(i.id));
  const newest = ids.reduce((a, b) => (a > b ? a : b));
  const oldest = ids.reduce((a, b) => (a < b ? a : b));

  const links: string[] = [];
  // `next` only when the page was full — a short page means the end.
  if (items.length >= limit) {
    links.push(`<${baseUrl}?max_id=${oldest}>; rel="next"`);
  }
  links.push(`<${baseUrl}?min_id=${newest}>; rel="prev"`);
  return links.join(", ");
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

export type RateLimitRule = { limit: number; windowSeconds: number };

/**
 * A professional network is a scraping target in a way a public microblog is
 * not — the profile data IS the asset. The directory and profile limits below
 * are anti-scraping measures first and abuse controls second.
 */
export const RATE_LIMITS: Record<string, RateLimitRule> = {
  "api:authenticated": { limit: 300, windowSeconds: 300 },
  "api:anonymous": { limit: 100, windowSeconds: 300 },
  "posts:create": { limit: 30, windowSeconds: 1800 },
  "connections:request": { limit: 50, windowSeconds: 86400 },
  "directory:read": { limit: 100, windowSeconds: 300 },
  "profiles:read": { limit: 200, windowSeconds: 300 },
  "auth:signup": { limit: 5, windowSeconds: 86400 },
  "auth:password_reset": { limit: 5, windowSeconds: 3600 },
  "verification:start": { limit: 10, windowSeconds: 86400 },
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
};

export async function consumeRateLimit(
  db: Pool | PoolClient,
  bucket: keyof typeof RATE_LIMITS | string,
  subject: string,
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[bucket] ?? RATE_LIMITS["api:anonymous"]!;

  const result = await db.query<{ consume_rate_limit: number }>(
    `SELECT brigade.consume_rate_limit($1, $2, $3)`,
    [bucket, subject, rule.windowSeconds],
  );
  const count = result.rows[0]?.consume_rate_limit ?? 1;

  const windowStartMs =
    Math.floor(Date.now() / 1000 / rule.windowSeconds) * rule.windowSeconds * 1000;

  return {
    allowed: count <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(rule.limit - count, 0),
    resetAt: new Date(windowStartMs + rule.windowSeconds * 1000),
  };
}

/** Clients can only back off gracefully if they are told where they stand. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
  };
}
