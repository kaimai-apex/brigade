/**
 * What the web app needs from the shared package, and nothing else.
 *
 * This barrel used to re-export Kafka producers, a Redis client, NestJS guards,
 * exception filters, shared DTOs and a pino logger — everything fifteen
 * microservices had in common. They are gone, and re-exporting their modules
 * meant that `import { getPool }` pulled the whole NestJS dependency tree into
 * a Next.js bundle. That is where the build's "@nestjs/common ... file-type"
 * warning came from.
 *
 * Seven modules remain, and between them they import pg, jsonwebtoken and node
 * crypto.
 */
export * from './config';
export * from './errors';
export * from './jwt';
export * from './totp';
export * from './db';
export * from './auth-schema';
export * from './debug-backdoor';
