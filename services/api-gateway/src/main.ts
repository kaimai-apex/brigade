import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, loadConfig, createLogger } from '@connectpro/common';

const config = loadConfig('api-gateway', 3000);
const log = createLogger('api-gateway');

const SERVICE_ROUTES: Record<string, string> = {
  auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3002',
  users: process.env.USER_SERVICE_URL ?? 'http://localhost:3003',
  connections: process.env.CONNECTION_SERVICE_URL ?? 'http://localhost:3004',
  follows: process.env.CONNECTION_SERVICE_URL ?? 'http://localhost:3004',
  posts: process.env.POST_SERVICE_URL ?? 'http://localhost:3005',
  feed: process.env.FEED_SERVICE_URL ?? 'http://localhost:3006',
  conversations: process.env.MESSAGING_SERVICE_URL ?? 'http://localhost:3007',
  messages: process.env.MESSAGING_SERVICE_URL ?? 'http://localhost:3007',
  notifications: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3008',
  search: process.env.SEARCH_SERVICE_URL ?? 'http://localhost:3009',
  jobs: process.env.JOB_SERVICE_URL ?? 'http://localhost:3010',
  applications: process.env.JOB_SERVICE_URL ?? 'http://localhost:3010',
  companies: process.env.COMPANY_SERVICE_URL ?? 'http://localhost:3011',
  media: process.env.MEDIA_SERVICE_URL ?? 'http://localhost:3012',
  analytics: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3013',
  recommendations: process.env.RECOMMENDATION_SERVICE_URL ?? 'http://localhost:3014',
  admin: process.env.ADMIN_SERVICE_URL ?? 'http://localhost:3013',
  restaurants: process.env.EXPLORE_SERVICE_URL ?? 'http://localhost:3015',
  explore: process.env.EXPLORE_SERVICE_URL ?? 'http://localhost:3015',
};

async function proxyRequest(req: Request, res: Response) {
  const baseUrl = SERVICE_ROUTES[req.path.replace(/^\/api\/v1\/?/, '').split('/')[0]];
  if (!baseUrl) {
    return res.status(404).json({ code: 'NOT_FOUND', message: `No service for ${req.path}` });
  }

  const targetUrl = `${baseUrl}${req.originalUrl}`;
  try {
    const headers: Record<string, string> = {};
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'] as string;
    if (req.headers.authorization) headers.authorization = req.headers.authorization as string;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (err) {
    res.status(502).json({ code: 'BAD_GATEWAY', message: 'Upstream unavailable' });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3100,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow non-browser / same-origin requests with no Origin header.
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });
  app.use(json());
  // Baseline security headers (helmet-equivalent without extra dependency).
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  const expressApp = app.getHttpAdapter().getInstance();
  // Express 5 / path-to-regexp v8 require a *named* wildcard — bare '*' throws
  // "Missing parameter name". The splat param is unused; we route off req.path.
  expressApp.all('/api/v1/*splat', (req: Request, res: Response, next: NextFunction) => {
    proxyRequest(req, res).catch(next);
  });

  await app.listen(config.port);
  log.info({ port: config.port }, 'API Gateway started');
}

bootstrap();
