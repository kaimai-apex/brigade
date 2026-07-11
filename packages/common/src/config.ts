export interface ServiceConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshExpiresIn: string;
  databaseUrl: string;
  redisUrl: string;
  kafkaBrokers: string[];
  otelEndpoint?: string;
}

function resolvePort(serviceName: string, defaultPort: number): number {
  const servicePortKey = `${serviceName.toUpperCase().replace(/-/g, '_')}_PORT`;
  if (process.env[servicePortKey]) {
    return parseInt(process.env[servicePortKey], 10);
  }
  // Only the gateway should read shared PORT/GATEWAY_PORT from .env
  if (serviceName === 'api-gateway') {
    return parseInt(
      process.env.GATEWAY_PORT ?? process.env.PORT ?? String(defaultPort),
      10,
    );
  }
  return defaultPort;
}

export function loadConfig(serviceName: string, defaultPort: number): ServiceConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const jwtSecret = process.env.JWT_SECRET?.trim();

  if (!jwtSecret) {
    if (nodeEnv === 'production') {
      throw new Error(
        `[${serviceName}] JWT_SECRET is required in production. Refusing to start with a default secret.`,
      );
    }
    // Local-only fallback — never use in deployed environments.
    console.warn(
      `[${serviceName}] WARNING: JWT_SECRET unset; using insecure local-dev secret. Set JWT_SECRET before any shared/deployed use.`,
    );
  }

  return {
    port: resolvePort(serviceName, defaultPort),
    nodeEnv,
    jwtSecret: jwtSecret || 'local-dev-only-not-for-deploy',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.REFRESH_EXPIRES_IN ?? '7d',
    databaseUrl:
      process.env.DATABASE_URL ??
      'postgresql://connectpro:connectpro@localhost:5432/connectpro',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    kafkaBrokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    otelEndpoint: process.env.OTEL_ENDPOINT ?? 'http://localhost:4318',
  };
}

export function serviceName(): string {
  return process.env.SERVICE_NAME ?? 'connectpro-service';
}
