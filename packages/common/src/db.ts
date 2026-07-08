import { Pool, PoolClient, PoolConfig } from 'pg';

let pool: Pool | null = null;

/**
 * Supabase direct hosts (db.{ref}.supabase.co) are IPv6-only — Vercel can't resolve them.
 * Rewrite to the Supavisor transaction pooler (IPv4, port 6543) for serverless.
 */
export function resolveDatabaseUrl(connectionString: string): string {
  if (process.env.DATABASE_POOLER_URL) {
    return process.env.DATABASE_POOLER_URL;
  }

  try {
    const url = new URL(connectionString);
    const directHostMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (!directHostMatch) {
      return connectionString;
    }

    const projectRef = directHostMatch[1];
    const region = process.env.SUPABASE_REGION ?? 'us-east-1';
    const poolerPrefix = process.env.SUPABASE_POOLER_PREFIX ?? 'aws-0';
    const poolerHost =
      process.env.SUPABASE_POOLER_HOST ?? `${poolerPrefix}-${region}.pooler.supabase.com`;

    url.hostname = poolerHost;
    url.port = process.env.SUPABASE_POOLER_PORT ?? '6543';

    if (url.username === 'postgres' && !url.username.includes('.')) {
      url.username = `postgres.${projectRef}`;
    }

    if (!url.searchParams.has('options')) {
      url.searchParams.set('options', `reference=${projectRef}`);
    }

    return url.toString();
  } catch {
    return connectionString;
  }
}

function poolOptions(connectionString: string): PoolConfig {
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
    const connectionString =
      databaseUrl ??
      process.env.DATABASE_URL ??
      'postgresql://connectpro:connectpro@localhost:5432/connectpro';
    pool = new Pool(poolOptions(connectionString));
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
