import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyAccessToken, loadConfig } from '@connectpro/common';

const config = loadConfig('explore-service', 3015);

/**
 * Allows either SYSTEM_ADMIN JWT OR a shared internal key for cron ingest.
 * Seed/ingest must not be callable by arbitrary authenticated users.
 */
@Injectable()
export class ExploreWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: unknown;
    }>();

    const internalKey = process.env.EXPLORE_INGEST_KEY?.trim();
    const provided =
      req.headers['x-internal-key'] ?? req.headers['x-explore-ingest-key'];
    if (internalKey && provided && provided === internalKey) {
      return true;
    }

    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing authorization (Bearer SYSTEM_ADMIN token or x-internal-key)',
      );
    }
    try {
      const user = verifyAccessToken(auth.slice(7), config.jwtSecret);
      req.user = user;
      if (user.roles?.includes('SYSTEM_ADMIN')) {
        return true;
      }
      throw new UnauthorizedException('SYSTEM_ADMIN role required');
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
