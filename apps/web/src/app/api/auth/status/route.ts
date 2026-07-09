import { NextResponse } from "next/server";
import { getAuthSchema, getPool, parsePostgresUrl, resolveDatabaseUrl } from "@connectpro/common";
import { formatAuthError } from "@/lib/auth/auth-errors";

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
      host: "unknown",
      authSchema: auth,
      ...formatAuthError(new Error("No DATABASE_URL or SUPABASE_DB_* env vars configured"), "config"),
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
    return NextResponse.json({
      ok: false,
      host,
      authSchema: auth,
      ...formatAuthError(error, "connect"),
    });
  }

  try {
    const pool = getPool();
    await pool.query(`SELECT 1 FROM ${auth}.users LIMIT 1`);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      host,
      authSchema: auth,
      ...formatAuthError(error, "schema"),
    });
  }

  return NextResponse.json({
    ok: true,
    host,
    authSchema: auth,
  });
}
