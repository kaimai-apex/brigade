import { Pool, PoolClient, PoolConfig } from 'pg';

let pool: Pool | null = null;

function poolOptions(connectionString: string): PoolConfig {
  const config: PoolConfig = { connectionString };
  if (connectionString.includes('supabase.co')) {
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
