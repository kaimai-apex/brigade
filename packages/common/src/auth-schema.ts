export function getAuthSchema(): string {
  const schema = process.env.AUTH_SCHEMA ?? 'auth';
  if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
    throw new Error('AUTH_SCHEMA must be a valid PostgreSQL identifier');
  }
  return schema;
}
