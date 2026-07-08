import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, loadConfig } from '@connectpro/common';

const config = loadConfig('api-gateway', 3000);

const PUBLIC_ROUTES = [
  '/api/v1/auth/signup',
  '/api/v1/auth/login',
  '/api/v1/auth/oauth',
  '/api/v1/auth/refresh-token',
  '/api/v1/auth/password/reset',
  '/api/v1/health',
];

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

@Injectable()
export class GatewayMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
    const isPublic = PUBLIC_ROUTES.some((r) => path.startsWith(r)) || path.includes('/health');

    if (!isPublic) {
      const auth = req.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          traceId: req.headers['x-request-id'] ?? crypto.randomUUID(),
        });
      }
      try {
        const user = verifyAccessToken(auth.slice(7), config.jwtSecret);
        (req as Request & { user: unknown }).user = user;
      } catch {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          traceId: req.headers['x-request-id'] ?? crypto.randomUUID(),
        });
      }
    }

    const clientId =
      (req as Request & { user?: { sub: string } }).user?.sub ??
      req.ip ??
      'anonymous';
    const now = Date.now();
    const windowMs = 60_000;
    const limit = path.includes('/auth/') ? 30 : 100;

    const entry = rateLimitStore.get(clientId);
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(clientId, { count: 1, resetAt: now + windowMs });
    } else {
      entry.count++;
      if (entry.count > limit) {
        res.setHeader('X-RateLimit-Limit', String(limit));
        res.setHeader('X-RateLimit-Remaining', '0');
        return res.status(429).json({
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          traceId: req.headers['x-request-id'] ?? crypto.randomUUID(),
        });
      }
    }

    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(limit - (rateLimitStore.get(clientId)?.count ?? 0)),
    );

    next();
  }
}
