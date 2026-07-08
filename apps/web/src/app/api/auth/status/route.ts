import { NextResponse } from "next/server";
import { getAuthSchema, getPool, parsePostgresUrl, resolveDatabaseUrl } from "@connectpro/common";

export async function GET() {
  const auth = getAuthSchema();
  const hasUrl = Boolean(process.env.DATABASE_URL || process.env.DATABASE_POOLER_URL);
  const hasDiscrete = Boolean(
    (process.env.POSTGRES_HOST || process.env.SUPABASE_DB_HOST) &&
      (process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD),
  );

  if (!hasUrl && !hasDiscrete) {
    return NextResponse.json({
      ok: false,
      step: "config",
      error: "No DATABASE_URL or SUPABASE_DB_* env vars configured",
    });
  }

  let host = "unknown";
  try {
    if (hasDiscrete) {
      host = process.env.POSTGRES_HOST ?? process.env.SUPABASE_DB_HOST ?? "unknown";
      host = host.replace(/^aws-0-([a-z0-9-]+)\.pooler\.supabase\.com$/i, "aws-1-$1.pooler.supabase.com");
    } else {
      const raw = process.env.DATABASE_URL ?? process.env.DATABASE_POOLER_URL ?? "";
      const parsed = parsePostgresUrl(raw);
      host = parsed?.host ?? resolveDatabaseUrl(raw).split("@")[1]?.split(":")[0] ?? "unknown";
      host = host.replace(/^aws-0-([a-z0-9-]+)\.pooler\.supabase\.com$/i, "aws-1-$1.pooler.supabase.com");
    }
  } catch {
    host = "parse_failed";
  }

  try {
    const pool = getPool();
    await pool.query("SELECT 1 AS ok");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      step: "connect",
      host,
      authSchema: auth,
      error: message,
      hint: message.includes("tenant/user")
        ? "Use aws-1-us-west-2.pooler.supabase.com (not aws-0). Reset DB password in Supabase → Database, then update Vercel DATABASE_URL."
        : message.includes("password authentication failed")
          ? "DB password is wrong. Reset it in Supabase → Database → Database password, then update Vercel."
          : undefined,
    });
  }

  try {
    const pool = getPool();
    await pool.query(`SELECT 1 FROM ${auth}.users LIMIT 1`);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      step: "schema",
      host,
      authSchema: auth,
      error: error instanceof Error ? error.message : String(error),
      hint: "Run supabase/migrations/003_connectpro_schemas_supabase.sql and 005_brigade_user_fields.sql in Supabase SQL Editor",
    });
  }

  return NextResponse.json({
    ok: true,
    host,
    authSchema: auth,
  });
}
