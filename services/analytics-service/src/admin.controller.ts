import { Controller, Post, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard, loadConfig, AuthenticatedRequest, requireRole, getAuthSchema } from '@connectpro/common';
import { Pool } from 'pg';
import { getPool } from '@connectpro/common';

const config = loadConfig('analytics-service', 3013);
const jwtGuard = new JwtAuthGuard(config.jwtSecret);
const pool = getPool(config.databaseUrl);
const auth = getAuthSchema();

@Controller('admin')
@UseGuards(jwtGuard)
export class AdminController {
  @Post('users/:id/suspend')
  async suspend(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    requireRole(req.user, 'SYSTEM_ADMIN', 'MODERATOR');
    await pool.query(
      `UPDATE ${auth}.users SET status = 'suspended', updated_at = now() WHERE id = $1`,
      [id],
    );
    return { success: true };
  }

  @Post('users/:id/ban')
  async ban(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    requireRole(req.user, 'SYSTEM_ADMIN');
    await pool.query(
      `UPDATE ${auth}.users SET status = 'banned', updated_at = now() WHERE id = $1`,
      [id],
    );
    return { success: true };
  }

  @Post('users/:id/verify')
  async verify(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    requireRole(req.user, 'SYSTEM_ADMIN', 'MODERATOR');
    await pool.query(
      `UPDATE ${auth}.users SET email_verified = true, updated_at = now() WHERE id = $1`,
      [id],
    );
    return { success: true };
  }

  @Get('reports')
  async reports(@Req() req: AuthenticatedRequest) {
    requireRole(req.user, 'MODERATOR', 'SYSTEM_ADMIN');
    return { data: [], message: 'Moderation queue stub' };
  }

  @Post('reports/:id/resolve')
  async resolve(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    requireRole(req.user, 'MODERATOR', 'SYSTEM_ADMIN');
    return { success: true, reportId: id };
  }
}
