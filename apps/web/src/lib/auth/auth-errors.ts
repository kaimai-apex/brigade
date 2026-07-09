import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@connectpro/common";

export type AuthErrorDetail = {
  message: string;
  detail: string;
  step: string;
  code?: string;
  hint?: string;
};

const STEP_LABELS: Record<string, string> = {
  config: "Configuration",
  connect: "Database connection",
  schema: "Database schema",
  login: "Login",
  signup: "Signup",
  auth: "Brigade session",
  proxy: "Auth service proxy",
  unknown: "Unknown",
};

export function authStepLabel(step: string) {
  return STEP_LABELS[step] ?? step;
}

function sanitizeErrorMessage(message: string) {
  return message
    .replace(/postgresql:\/\/[^\s@]+@[^\s]+/gi, "postgresql://***:***@***")
    .replace(/(password=)[^\s&]+/gi, "$1[redacted]")
    .trim();
}

function inferPgCode(error: unknown, message: string) {
  const code = (error as { code?: string })?.code;
  if (code) return code;
  if (message.includes("password authentication failed")) return "28P01";
  if (message.includes("ENOTFOUND")) return "ENOTFOUND";
  if (message.includes("ECONNREFUSED")) return "ECONNREFUSED";
  if (message.includes("timeout")) return "ETIMEDOUT";
  if (message.includes("does not exist")) return "42P01";
  return undefined;
}

export function formatAuthError(error: unknown, step = "unknown"): AuthErrorDetail {
  if (error instanceof ConflictError) {
    return {
      step,
      code: "CONFLICT",
      message: error.message,
      detail: error.message,
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      step,
      code: "UNAUTHORIZED",
      message: error.message,
      detail: error.message,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      step,
      code: "NOT_FOUND",
      message: error.message,
      detail: error.message,
    };
  }

  const raw = error instanceof Error ? error.message : String(error);
  const detail = sanitizeErrorMessage(raw);
  const code = inferPgCode(error, detail);

  if (detail.includes("DATABASE_URL is not configured") || detail.includes("No DATABASE_URL")) {
    return {
      step: "config",
      code: "MISSING_DATABASE_URL",
      message: "Database is not configured on the server.",
      detail,
      hint: "In Vercel, set SUPABASE_DB_HOST, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD, SUPABASE_DB_PORT=6543 (or a Transaction pooler DATABASE_URL), then redeploy.",
    };
  }

  if (detail.includes("DATABASE_URL looks malformed") || detail.includes('host parsed as "base"')) {
    return {
      step: "config",
      code: "MALFORMED_DATABASE_URL",
      message: "DATABASE_URL is malformed.",
      detail,
      hint: "Paste only the Transaction pooler URI from Supabase Connect → ORMs → Prisma (first DATABASE_URL line). No quotes, no comments, no DIRECT_URL line. If your password contains @ or #, use SUPABASE_DB_PASSWORD instead.",
    };
  }

  if (detail.includes("db.") && detail.includes(".supabase.co") && detail.includes("ENOTFOUND")) {
    return {
      step: "connect",
      code: "IPV6_DIRECT_HOST",
      message: "Cannot reach Supabase direct database host (IPv6-only).",
      detail,
      hint: "Use the Transaction pooler host aws-1-us-west-2.pooler.supabase.com:6543, not db.*.supabase.co.",
    };
  }

  if (detail.includes("tenant/user") && detail.includes("not found")) {
    return {
      step: "connect",
      code: "POOLER_TENANT",
      message: "Supabase pooler does not recognize this project on that host.",
      detail,
      hint: "Use aws-1-us-west-2.pooler.supabase.com (not aws-0). User must be postgres.tldovunmovsbxqcpxwvs. Copy the exact URI from Supabase Connect.",
    };
  }

  if (detail.includes("password authentication failed")) {
    return {
      step: "connect",
      code: code ?? "DB_PASSWORD",
      message: "Supabase rejected the database password.",
      detail,
      hint: "Reset the database password in Supabase → Database → Reset password. Update SUPABASE_DB_PASSWORD in Vercel (or DATABASE_URL) and redeploy. Check https://www.joinbrigade.co/api/auth/status shows ok:true.",
    };
  }

  if (detail.includes("ENOTFOUND")) {
    return {
      step: "connect",
      code: code ?? "ENOTFOUND",
      message: "Could not resolve the database hostname.",
      detail,
      hint: "Verify SUPABASE_DB_HOST is aws-1-us-west-2.pooler.supabase.com and redeploy.",
    };
  }

  if (detail.includes("ECONNREFUSED") || detail.includes("ETIMEDOUT")) {
    return {
      step: "connect",
      code: code ?? "ECONNREFUSED",
      message: "Could not connect to the database.",
      detail,
      hint: "Check Supabase project is active and pooler port is 6543 (transaction mode).",
    };
  }

  if (detail.includes("connectpro_auth") && detail.includes("does not exist")) {
    return {
      step: "schema",
      code: code ?? "42P01",
      message: "Auth tables are missing in Postgres.",
      detail,
      hint: "Run supabase/migrations/000_wipe_brigade.sql then 001_auth.sql → 006_notifications.sql in Supabase SQL Editor. AUTH_SCHEMA must be connectpro_auth.",
    };
  }

  if (detail.includes("users.profiles") && detail.includes("does not exist")) {
    return {
      step: "schema",
      code: code ?? "42P01",
      message: "Profile tables are missing in Postgres.",
      detail,
      hint: "Run supabase/migrations/002_users.sql (after 001_auth.sql) in Supabase SQL Editor.",
    };
  }

  if (detail.includes("auth_service_unreachable") || detail.includes("fetch failed")) {
    return {
      step: "proxy",
      code: "GATEWAY_UNREACHABLE",
      message: "Could not reach the auth microservice.",
      detail,
      hint: "For local dev, run pnpm dev:stack. For production, set SUPABASE_DB_* env vars so auth runs inside Vercel without a separate backend.",
    };
  }

  return {
    step,
    code,
    message: detail || "Authentication failed.",
    detail: detail || "Unknown error",
    hint: "Check Vercel env vars and https://www.joinbrigade.co/api/auth/status for diagnostics.",
  };
}

export function parseAuthErrorFromSearchParams(params: {
  get(name: string): string | null;
}): AuthErrorDetail | null {
  const error = params.get("error");
  if (!error) return null;

  const reason = params.get("reason");
  const detail = params.get("detail");
  const hint = params.get("hint");
  const step = params.get("step") ?? "unknown";
  const code = params.get("code") ?? undefined;

  return {
    message: reason ? decodeURIComponent(reason) : "Sign-in failed.",
    detail: detail ? decodeURIComponent(detail) : reason ? decodeURIComponent(reason) : "",
    step,
    code,
    hint: hint ? decodeURIComponent(hint) : undefined,
  };
}
