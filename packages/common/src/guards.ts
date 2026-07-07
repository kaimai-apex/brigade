import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyAccessToken, JwtPayload } from './jwt';

export interface AuthenticatedRequest {
  user: JwtPayload;
  headers: { authorization?: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtSecret: string) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }
    try {
      req.user = verifyAccessToken(auth.slice(7), this.jwtSecret);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

export function requireRole(user: JwtPayload, ...roles: string[]): void {
  const hasRole = roles.some((r) => user.roles.includes(r));
  if (!hasRole) {
    throw new UnauthorizedException('Insufficient permissions');
  }
}
