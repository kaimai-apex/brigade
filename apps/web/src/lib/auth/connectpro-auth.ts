import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  getAuthSchema,
  getPool,
  signAccessToken,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "@connectpro/common";
import { ensureAuthSchema } from "@/lib/auth/ensure-auth-schema";
import { isDebugBackdoorLogin, DEBUG_BACKDOOR_EMAIL, DEBUG_BACKDOOR_PASSWORD } from "@/lib/auth/debug-backdoor";
import { formatAuthError, type AuthErrorDetail } from "@/lib/auth/auth-errors";

const auth = getAuthSchema();

function jwtConfig() {
  return {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  };
}

function databaseConfigured() {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.DATABASE_POOLER_URL ||
      ((process.env.POSTGRES_HOST || process.env.SUPABASE_DB_HOST) &&
        (process.env.POSTGRES_PASSWORD || process.env.SUPABASE_DB_PASSWORD)),
  );
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokens(userId: string, email: string, roles: string[]) {
  const pool = getPool();
  const { secret, expiresIn } = jwtConfig();
  const accessToken = signAccessToken({ sub: userId, email, roles }, secret, expiresIn);
  const refreshToken = randomBytes(48).toString("hex");
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO ${auth}.refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  return { accessToken, refreshToken };
}

async function issueTokensForUserId(userId: string) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT u.id, u.email, array_agg(r.role) as roles
     FROM ${auth}.users u
     LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
     WHERE u.id = $1 AND u.deleted_at IS NULL
     GROUP BY u.id, u.email`,
    [userId],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("User not found");
  }

  const user = result.rows[0];
  const roles: string[] = user.roles.filter(Boolean);
  const tokens = await issueTokens(user.id, user.email, roles);
  return { userId: user.id, ...tokens };
}

export function isConnectProAuthConfigured() {
  return databaseConfigured();
}

export async function connectProSignup(dto: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  if (!databaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  await ensureAuthSchema();

  const pool = getPool();
  const existing = await pool.query(
    `SELECT id FROM ${auth}.users WHERE email = $1 AND deleted_at IS NULL`,
    [dto.email.toLowerCase()],
  );
  if (existing.rows.length > 0) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await bcrypt.hash(dto.password, 12);
  const result = await pool.query(
    `INSERT INTO ${auth}.users (email, password_hash)
     VALUES ($1, $2) RETURNING id, email`,
    [dto.email.toLowerCase(), passwordHash],
  );
  const user = result.rows[0];

  await pool.query(`INSERT INTO ${auth}.user_roles (user_id, role) VALUES ($1, $2)`, [
    user.id,
    "USER",
  ]);

  await pool.query(
    `INSERT INTO users.profiles (user_id, first_name, last_name, completeness, onboarding_step)
     VALUES ($1, $2, $3, 10, 0) ON CONFLICT (user_id) DO NOTHING`,
    [user.id, dto.firstName, dto.lastName],
  );

  const tokens = await issueTokens(user.id, user.email, ["USER"]);
  return { userId: user.id, ...tokens };
}

async function ensureDebugAdministratorUser() {
  await ensureAuthSchema();
  const pool = getPool();

  const existing = await pool.query(
    `SELECT u.id, u.email, array_agg(r.role) as roles
     FROM ${auth}.users u
     LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
     WHERE u.email = $1 AND u.deleted_at IS NULL
     GROUP BY u.id, u.email`,
    [DEBUG_BACKDOOR_EMAIL],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0] as { id: string; email: string; roles: string[] };
  }

  const passwordHash = await bcrypt.hash(DEBUG_BACKDOOR_PASSWORD, 12);
  const created = await pool.query(
    `INSERT INTO ${auth}.users (email, password_hash, email_verified)
     VALUES ($1, $2, true) RETURNING id, email`,
    [DEBUG_BACKDOOR_EMAIL, passwordHash],
  );
  const user = created.rows[0];

  await pool.query(`INSERT INTO ${auth}.user_roles (user_id, role) VALUES ($1, $2)`, [
    user.id,
    "SYSTEM_ADMIN",
  ]);
  await pool.query(`INSERT INTO ${auth}.user_roles (user_id, role) VALUES ($1, $2)`, [
    user.id,
    "USER",
  ]);

  await pool.query(
    `INSERT INTO users.profiles (
       user_id, first_name, last_name, completeness, onboarding_step, onboarding_completed
     ) VALUES ($1, $2, $3, 100, 99, true)
     ON CONFLICT (user_id) DO UPDATE SET onboarding_completed = true, completeness = 100`,
    [user.id, "Debug", "Administrator"],
  );

  return { id: user.id, email: user.email, roles: ["SYSTEM_ADMIN", "USER"] };
}

export async function connectProLogin(dto: { email: string; password: string }) {
  if (isDebugBackdoorLogin(dto.email, dto.password)) {
    if (!databaseConfigured()) {
      throw new Error("DATABASE_URL is not configured");
    }

    const user = await ensureDebugAdministratorUser();
    const roles: string[] = user.roles.filter(Boolean);
    const tokens = await issueTokens(user.id, user.email, roles);
    return { userId: user.id, ...tokens };
  }

  if (!databaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.status, u.mfa_enabled,
            array_agg(r.role) as roles
     FROM ${auth}.users u
     LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
     WHERE u.email = $1 AND u.deleted_at IS NULL
     GROUP BY u.id`,
    [dto.email.toLowerCase()],
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const user = result.rows[0];
  if (user.status !== "active") {
    throw new UnauthorizedError("Account is suspended or banned");
  }

  const valid = await bcrypt.compare(dto.password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.mfa_enabled) {
    return { mfaRequired: true, userId: user.id };
  }

  const roles: string[] = user.roles.filter(Boolean);
  const tokens = await issueTokens(user.id, user.email, roles);
  return { userId: user.id, ...tokens };
}

export async function connectProRefresh(refreshToken: string) {
  if (!databaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const pool = getPool();
  const tokenHash = hashToken(refreshToken);
  const result = await pool.query(
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
    throw new UnauthorizedError("Invalid refresh token");
  }

  const row = result.rows[0];
  await pool.query(`UPDATE ${auth}.refresh_tokens SET revoked_at = now() WHERE id = $1`, [
    row.id,
  ]);

  const roles: string[] = row.roles.filter(Boolean);
  return issueTokens(row.user_id, row.email, roles);
}

export async function connectProLogout(refreshToken: string) {
  if (!databaseConfigured()) {
    return { success: true };
  }

  const pool = getPool();
  const tokenHash = hashToken(refreshToken);
  await pool.query(`UPDATE ${auth}.refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [
    tokenHash,
  ]);
  return { success: true };
}

export function toAuthErrorResponse(error: unknown, step = "auth"): { status: number; body: AuthErrorDetail } {
  const info = formatAuthError(error, step);

  if (error instanceof ConflictError) {
    return { status: 409, body: info };
  }
  if (error instanceof UnauthorizedError) {
    return { status: 401, body: info };
  }
  if (error instanceof NotFoundError) {
    return { status: 404, body: info };
  }

  return { status: 500, body: info };
}
