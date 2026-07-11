import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import {
  loadConfig,
  getPool,
  getAuthSchema,
  signAccessToken,
  signMfaChallengeToken,
  verifyMfaChallengeToken,
  verifyTotp,
  KafkaClient,
  RedisCache,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  isDebugBackdoorLogin,
  isDebugBackdoorEnabled,
} from '@connectpro/common';
import { SignupDto, LoginDto } from './dto/auth.dto';

const config = loadConfig('auth-service', 3002);
const auth = getAuthSchema();

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private kafka: KafkaClient;
  private redis: RedisCache;

  constructor() {
    this.pool = getPool(config.databaseUrl);
    this.kafka = new KafkaClient('auth-service', config.kafkaBrokers);
    this.redis = new RedisCache(config.redisUrl);
  }

  async onModuleInit() {
    await this.redis.connect();
  }

  async onModuleDestroy() {
    await this.kafka.disconnect();
    await this.redis.disconnect();
  }

  async signup(dto: SignupDto) {
    const existing = await this.pool.query(
      `SELECT id FROM ${auth}.users WHERE email = $1 AND deleted_at IS NULL`,
      [dto.email.toLowerCase()],
    );
    if (existing.rows.length > 0) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const result = await this.pool.query(
      `INSERT INTO ${auth}.users (email, password_hash)
       VALUES ($1, $2) RETURNING id, email`,
      [dto.email.toLowerCase(), passwordHash],
    );
    const user = result.rows[0];

    await this.pool.query(
      `INSERT INTO ${auth}.user_roles (user_id, role) VALUES ($1, $2)`,
      [user.id, 'USER'],
    );

    const tokens = await this.issueTokens(user.id, user.email, ['USER']);

    await this.pool.query(
      `INSERT INTO users.profiles (user_id, first_name, last_name, completeness, onboarding_step)
       VALUES ($1, $2, $3, 10, 0) ON CONFLICT (user_id) DO NOTHING`,
      [user.id, dto.firstName, dto.lastName],
    );

    await this.kafka.publish('user-created', 'user.created', {
      userId: user.id,
      email: user.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return { userId: user.id, ...tokens };
  }

  async login(dto: LoginDto) {
    if (isDebugBackdoorLogin(dto.email, dto.password)) {
      const user = await this.ensureDebugAdministratorUser();
      const roles: string[] = user.roles.filter(Boolean);
      const tokens = await this.issueTokens(user.id, user.email, roles);
      return { userId: user.id, ...tokens };
    }

    const result = await this.pool.query(
      `SELECT u.id, u.email, u.password_hash, u.status, u.mfa_enabled,
              array_agg(r.role) as roles
       FROM ${auth}.users u
       LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       GROUP BY u.id`,
      [dto.email.toLowerCase()],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      throw new UnauthorizedError('Account is suspended or banned');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.mfa_enabled) {
      const mfaToken = signMfaChallengeToken(user.id, user.email, config.jwtSecret);
      return { mfaRequired: true, userId: user.id, mfaToken };
    }

    const roles: string[] = user.roles.filter(Boolean);
    const tokens = await this.issueTokens(user.id, user.email, roles);
    return { userId: user.id, ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const result = await this.pool.query(
      `SELECT rt.id, rt.user_id, u.email, array_agg(r.role) as roles
       FROM ${auth}.refresh_tokens rt
       JOIN ${auth}.users u ON u.id = rt.user_id
       LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > now()
       AND u.deleted_at IS NULL
       GROUP BY rt.id, rt.user_id, u.email`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const row = result.rows[0];
    await this.pool.query(
      `UPDATE ${auth}.refresh_tokens SET revoked_at = now() WHERE id = $1`,
      [row.id],
    );

    const roles: string[] = row.roles.filter(Boolean);
    return this.issueTokens(row.user_id, row.email, roles);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.pool.query(
      `UPDATE ${auth}.refresh_tokens SET revoked_at = now() WHERE token_hash = $1`,
      [tokenHash],
    );
    return { success: true };
  }

  async passwordReset(email: string) {
    const result = await this.pool.query(
      `SELECT id FROM ${auth}.users WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase()],
    );
    if (result.rows.length === 0) {
      return { message: 'If the email exists, a reset link has been sent' };
    }
    return { message: 'If the email exists, a reset link has been sent' };
  }

  async verifyMfa(mfaToken: string, code: string) {
    let challenge: { sub: string; email: string };
    try {
      challenge = verifyMfaChallengeToken(mfaToken, config.jwtSecret);
    } catch {
      throw new UnauthorizedError('Invalid or expired MFA challenge');
    }

    const result = await this.pool.query(
      `SELECT u.id, u.email, u.mfa_secret, array_agg(r.role) as roles
       FROM ${auth}.users u
       LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
       WHERE u.id = $1 AND u.mfa_enabled = true
       GROUP BY u.id`,
      [challenge.sub],
    );
    if (result.rows.length === 0) {
      throw new NotFoundError('User not found or MFA not enabled');
    }
    const user = result.rows[0];
    if (!user.mfa_secret || typeof user.mfa_secret !== 'string') {
      throw new UnauthorizedError('MFA is not configured for this account');
    }
    if (!verifyTotp(user.mfa_secret, code)) {
      throw new UnauthorizedError('Invalid MFA code');
    }
    const roles: string[] = user.roles.filter(Boolean);
    const tokens = await this.issueTokens(user.id, user.email, roles);
    return { userId: user.id, ...tokens };
  }

  private async issueTokensForUserId(userId: string) {
    const result = await this.pool.query(
      `SELECT u.id, u.email, array_agg(r.role) as roles
       FROM ${auth}.users u
       LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       GROUP BY u.id, u.email`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const user = result.rows[0];
    const roles: string[] = user.roles.filter(Boolean);
    const tokens = await this.issueTokens(user.id, user.email, roles);
    return { userId: user.id, ...tokens };
  }

  private async issueTokens(userId: string, email: string, roles: string[]) {
    const accessToken = signAccessToken(
      { sub: userId, email, roles },
      config.jwtSecret,
      config.jwtExpiresIn,
    );
    const refreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.pool.query(
      `INSERT INTO ${auth}.refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async ensureDebugAdministratorUser() {
    if (!isDebugBackdoorEnabled()) {
      throw new UnauthorizedError('Debug login is disabled');
    }
    const email = process.env.DEBUG_LOGIN_EMAIL!.trim().toLowerCase();
    const password = process.env.DEBUG_LOGIN_PASSWORD!;

    const existing = await this.pool.query(
      `SELECT u.id, u.email, array_agg(r.role) as roles
       FROM ${auth}.users u
       LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
       WHERE u.email = $1 AND u.deleted_at IS NULL
       GROUP BY u.id, u.email`,
      [email],
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await this.pool.query(
      `INSERT INTO ${auth}.users (email, password_hash, email_verified)
       VALUES ($1, $2, true) RETURNING id, email`,
      [email, passwordHash],
    );
    const user = created.rows[0];

    // Never auto-grant SYSTEM_ADMIN — debug account is a normal USER.
    await this.pool.query(`INSERT INTO ${auth}.user_roles (user_id, role) VALUES ($1, $2)`, [
      user.id,
      'USER',
    ]);

    await this.pool.query(
      `INSERT INTO users.profiles (
         user_id, first_name, last_name, completeness, onboarding_step, onboarding_completed
       ) VALUES ($1, $2, $3, 100, 99, true)
       ON CONFLICT (user_id) DO UPDATE SET onboarding_completed = true, completeness = 100`,
      [user.id, 'Debug', 'User'],
    );

    return { id: user.id, email: user.email, roles: ['USER'] };
  }
}
