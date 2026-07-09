import { Pool, PoolClient, PoolConfig } from 'pg';

let pool: Pool | null = null;

function stripQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

type ParsedPostgresUrl = {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
  search: string;
};

/** Parse postgres:// URIs without URL(), which breaks on @ in passwords. */
export function parsePostgresUrl(connectionString: string): ParsedPostgresUrl | null {
  const trimmed = stripQuotes(connectionString.trim());
  const match = trimmed.match(/^postgres(?:ql)?:\/\//i);
  if (!match) return null;

  const withoutProto = trimmed.slice(match[0].length);
  const atIdx = withoutProto.lastIndexOf('@');
  if (atIdx <= 0) return null;

  const userInfo = withoutProto.slice(0, atIdx);
  const colonIdx = userInfo.indexOf(':');
  if (colonIdx <= 0) return null;

  const user = decodeURIComponent(userInfo.slice(0, colonIdx));
  const password = decodeURIComponent(userInfo.slice(colonIdx + 1));

  const hostPart = withoutProto.slice(atIdx + 1);
  const slashIdx = hostPart.indexOf('/');
  const authority = slashIdx >= 0 ? hostPart.slice(0, slashIdx) : hostPart;
  const pathAndQuery = slashIdx >= 0 ? hostPart.slice(slashIdx + 1) : 'postgres';

  const queryIdx = pathAndQuery.indexOf('?');
  const database = decodeURIComponent(
    queryIdx >= 0 ? pathAndQuery.slice(0, queryIdx) : pathAndQuery || 'postgres',
  );
  const search = queryIdx >= 0 ? pathAndQuery.slice(queryIdx) : '';

  const portColonIdx = authority.lastIndexOf(':');
  const host =
    portColonIdx >= 0 ? authority.slice(0, portColonIdx) : authority;
  const port =
    portColonIdx >= 0 ? parseInt(authority.slice(portColonIdx + 1), 10) : 5432;

  if (!host || Number.isNaN(port)) return null;

  return { user, password, host, port, database, search };
}

function buildPostgresUrl(parts: ParsedPostgresUrl) {
  const user = encodeURIComponent(parts.user);
  const password = encodeURIComponent(parts.password);
  const database = encodeURIComponent(parts.database);
  const search = parts.search.startsWith('?') ? parts.search : parts.search ? `?${parts.search}` : '';
  return `postgresql://${user}:${password}@${parts.host}:${parts.port}/${database}${search}`;
}

function isLocalDbHost(host: string) {
  const normalized = host.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === 'host.docker.internal'
  );
}

function validateHost(host: string) {
  if (isLocalDbHost(host)) return;
  if (!host || host === 'base' || !host.includes('.')) {
    throw new Error(
      'DATABASE_URL looks malformed (host parsed as "' +
        host +
        '"). In Vercel, paste the Supabase Transaction pooler URI only — no quotes, no extra lines. If your DB password contains @ or #, reset it in Supabase or use POSTGRES_PASSWORD instead.',
    );
  }
}

function inferSupabaseProjectRef(): string | null {
  const envRef = process.env.SUPABASE_PROJECT_REF;
  if (envRef) return envRef;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
  const urlMatch = supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (urlMatch?.[1]) return urlMatch[1];

  return 'tldovunmovsbxqcpxwvs';
}

/**
 * Supabase direct hosts (db.{ref}.supabase.co) are IPv6-only — Vercel can't resolve them.
 * Rewrite to the Supavisor transaction pooler (IPv4, port 6543) for serverless.
 */
export function resolveDatabaseUrl(connectionString: string): string {
  if (process.env.DATABASE_POOLER_URL) {
    return stripQuotes(process.env.DATABASE_POOLER_URL);
  }

  const parsed = parsePostgresUrl(connectionString);
  if (!parsed) {
    return stripQuotes(connectionString);
  }

  validateHost(parsed.host);

  const directHostMatch = parsed.host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  if (directHostMatch) {
    const projectRef = directHostMatch[1];
    const region = process.env.SUPABASE_REGION ?? 'us-west-2';
    const poolerPrefix = process.env.SUPABASE_POOLER_PREFIX ?? 'aws-1';
    parsed.host =
      process.env.SUPABASE_POOLER_HOST ?? `${poolerPrefix}-${region}.pooler.supabase.com`;
    parsed.port = parseInt(process.env.SUPABASE_POOLER_PORT ?? '6543', 10);
    if (parsed.user === 'postgres' && !parsed.user.includes('.')) {
      parsed.user = `postgres.${projectRef}`;
    }
    if (!parsed.search.includes('reference=')) {
      parsed.search = parsed.search
        ? `${parsed.search}&options=reference%3D${projectRef}`
        : `?options=reference%3D${projectRef}`;
    }
  }

  validateHost(parsed.host);

  // Newer Supabase projects use aws-1 pooler; aws-0 returns "tenant not found".
  parsed.host = parsed.host.replace(
    /^aws-0-([a-z0-9-]+)\.pooler\.supabase\.com$/i,
    'aws-1-$1.pooler.supabase.com',
  );

  if (parsed.host.includes('pooler.supabase.com') && parsed.user === 'postgres') {
    const ref = inferSupabaseProjectRef();
    if (ref) parsed.user = `postgres.${ref}`;
  }

  validateHost(parsed.host);
  return buildPostgresUrl(parsed);
}

function poolOptionsFromEnv(): PoolConfig {
  let host = process.env.POSTGRES_HOST ?? process.env.SUPABASE_DB_HOST;
  const password = process.env.POSTGRES_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD;
  const user =
    process.env.POSTGRES_USER ??
    process.env.SUPABASE_DB_USER ??
    `postgres.${process.env.SUPABASE_PROJECT_REF ?? 'tldovunmovsbxqcpxwvs'}`;

  if (host && password) {
    host = host.replace(/^aws-0-([a-z0-9-]+)\.pooler\.supabase\.com$/i, 'aws-1-$1.pooler.supabase.com');
    validateHost(host);
    return {
      host,
      port: parseInt(process.env.POSTGRES_PORT ?? process.env.SUPABASE_DB_PORT ?? '6543', 10),
      user,
      password,
      database: process.env.POSTGRES_DATABASE ?? 'postgres',
      ssl: { rejectUnauthorized: false },
      max: process.env.VERCEL ? 1 : 10,
      idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
    };
  }

  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://connectpro:connectpro@localhost:5432/connectpro';
  const resolved = resolveDatabaseUrl(connectionString);
  const config: PoolConfig = {
    connectionString: resolved,
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
  };

  if (resolved.includes('supabase.co')) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

export function getPool(databaseUrl?: string): Pool {
  if (!pool) {
    const discreteHost = process.env.POSTGRES_HOST ?? process.env.SUPABASE_DB_HOST;
    const discretePassword =
      process.env.POSTGRES_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD;

    if (discreteHost && discretePassword) {
      pool = new Pool(poolOptionsFromEnv());
    } else if (databaseUrl || process.env.DATABASE_URL || process.env.DATABASE_POOLER_URL) {
      const connectionString =
        databaseUrl ?? process.env.DATABASE_URL ?? process.env.DATABASE_POOLER_URL ?? "";
      const resolved = resolveDatabaseUrl(connectionString);
      pool = new Pool({
        connectionString: resolved,
        max: process.env.VERCEL ? 1 : 10,
        idleTimeoutMillis: process.env.VERCEL ? 5000 : 30000,
        ssl: resolved.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      pool = new Pool(poolOptionsFromEnv());
    }
  }
  return pool;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
