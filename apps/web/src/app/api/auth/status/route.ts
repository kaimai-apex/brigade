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
    } else {
      const raw = process.env.DATABASE_URL ?? process.env.DATABASE_POOLER_URL ?? "";
      const parsed = parsePostgresUrl(raw);
      host = parsed?.host ?? resolveDatabaseUrl(raw).split("@")[1]?.split(":")[0] ?? "unknown";
    }
  } catch {
    host = "parse_failed";
  }

  try {
    const pool = getPool();
    await pool.query("SELECT 1 AS ok");
  } catch (error) {
    return NextResponse.json({
      ok: false,
      step: "connect",
      host,
      authSchema: auth,
      error: error instanceof Error ? error.message : String(error),
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
