import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import {
  getAuthSchema,
  getPool,
  signAccessToken,
  signMfaChallengeToken,
  verifyMfaChallengeToken,
  verifyTotp,
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "@connectpro/common";
import {
  CODE_TTL_MINUTES,
  canRevealCode,
  isEmailConfigured,
  sendLoginCode,
} from "@/lib/auth/send-login-code";
import { ensureAuthSchema } from "@/lib/auth/ensure-auth-schema";
import { isDebugBackdoorLogin } from "@/lib/auth/debug-backdoor";
import { DEMO_ACCOUNT_EMAIL } from "@/lib/auth/demo-access";
import { ensureDirectorySchema } from "@/lib/server/ensure-directory-schema";
import { formatAuthError, type AuthErrorDetail } from "@/lib/auth/auth-errors";

const auth = getAuthSchema();

function jwtConfig() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production");
    }
    console.warn(
      "[web] WARNING: JWT_SECRET unset; using insecure local-dev secret.",
    );
  }
  return {
    secret: secret || "local-dev-only-not-for-deploy",
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  };
}

/**
 * How long a development session lasts.
 *
 * Real sessions are 15 minutes, which is right for production and miserable to
 * work against: looking at four screens takes longer than that, and being
 * bounced to /login mid-click is the tax every person who touches this app pays
 * all day. Thirty days locally, unchanged everywhere else.
 */
export const DEV_SESSION_SECONDS = 60 * 60 * 24 * 30;

/**
 * An access token for local work only.
 *
 * Throws rather than shortens in production. A helper that quietly degrades is
 * a helper someone eventually calls from the wrong place, and the failure mode
 * would be month-long production sessions that nobody notices.
 */
export function devLongLivedAccessToken(userId: string, email: string, roles: string[]) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("devLongLivedAccessToken must never be reached in production");
  }
  const { secret } = jwtConfig();
  return signAccessToken({ sub: userId, email, roles }, secret, `${DEV_SESSION_SECONDS}s`);
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
  const email = process.env.DEBUG_LOGIN_EMAIL!.trim().toLowerCase();
  const password = process.env.DEBUG_LOGIN_PASSWORD!;

  const existing = await pool.query(
    `SELECT u.id, u.email, array_agg(r.role) as roles
     FROM ${auth}.users u
     LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
     WHERE u.email = $1 AND u.deleted_at IS NULL
     GROUP BY u.id, u.email`,
    [email],
  );

  if (existing.rows.length > 0) {
    return existing.rows[0] as { id: string; email: string; roles: string[] };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await pool.query(
    `INSERT INTO ${auth}.users (email, password_hash, email_verified)
     VALUES ($1, $2, true) RETURNING id, email`,
    [email, passwordHash],
  );
  const user = created.rows[0];

  await pool.query(`INSERT INTO ${auth}.user_roles (user_id, role) VALUES ($1, $2)`, [
    user.id,
    "USER",
  ]);

  await pool.query(
    `INSERT INTO users.profiles (
       user_id, first_name, last_name, completeness, onboarding_step, onboarding_completed
     ) VALUES ($1, $2, $3, 100, 99, true)
     ON CONFLICT (user_id) DO UPDATE SET onboarding_completed = true, completeness = 100`,
    [user.id, "Debug", "User"],
  );

  return { id: user.id, email: user.email, roles: ["USER"] };
}

/**
 * The shared demo member. Created on first use so the demo works against any
 * configured database (local docker Postgres or the hosted one) without a seed
 * step. Its password hash is random — the account can only be entered through
 * the demo password gate, never through /login.
 */
async function ensureDemoUser() {
  await ensureAuthSchema();
  await ensureDirectorySchema().catch(() => undefined);
  const pool = getPool();
  const email = DEMO_ACCOUNT_EMAIL;

  const existing = await pool.query(
    `SELECT u.id, u.email, array_agg(r.role) as roles
     FROM ${auth}.users u
     LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
     WHERE u.email = $1 AND u.deleted_at IS NULL
     GROUP BY u.id, u.email`,
    [email],
  );

  if (existing.rows.length > 0) {
    const found = existing.rows[0] as { id: string; email: string; roles: string[] };
    await hideDemoFromDirectory(found.id);
    return found;
  }

  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
  const created = await pool.query(
    `INSERT INTO ${auth}.users (email, password_hash, email_verified)
     VALUES ($1, $2, true) RETURNING id, email`,
    [email, passwordHash],
  );
  const user = created.rows[0];

  await pool.query(`INSERT INTO ${auth}.user_roles (user_id, role) VALUES ($1, $2)`, [
    user.id,
    "USER",
  ]);

  await pool.query(
    `INSERT INTO users.profiles (
       user_id, first_name, last_name, headline, completeness, onboarding_step, onboarding_completed
     ) VALUES ($1, $2, $3, $4, 100, 99, true)
     ON CONFLICT (user_id) DO UPDATE SET onboarding_completed = true, completeness = 100`,
    [user.id, "Brigade", "Demo", "Taking a look around Brigade"],
  );

  await hideDemoFromDirectory(user.id);

  return { id: user.id, email: user.email, roles: ["USER"] };
}

/**
 * Keep the shared demo account out of the member directory. Re-applied on every
 * demo login so an account created before the directory column existed still
 * gets hidden. Best-effort: the demo must not fail over a cosmetic flag.
 */
async function hideDemoFromDirectory(userId: string) {
  await getPool()
    .query(`UPDATE users.profiles SET visible_in_directory = false WHERE user_id = $1`, [
      userId,
    ])
    .catch(() => undefined);
}

/**
 * Log in as the shared demo member. The caller is responsible for checking the
 * demo password first (see lib/auth/demo-access).
 */
export async function connectProDemoLogin() {
  if (!databaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const user = await ensureDemoUser();
  const roles: string[] = user.roles.filter(Boolean);
  const tokens = await issueTokens(user.id, user.email, roles);
  return { userId: user.id, ...tokens };
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

  /**
   * An account created passwordlessly has no hash at all.
   *
   * Checked before bcrypt sees it, for two reasons. `compare` against null does
   * not return false — it throws, which would surface as a 500 and tell an
   * anonymous caller that the address exists. And a future bcrypt that returned
   * false-y for a null digest would be a way in for anyone who could reach this
   * endpoint. Members log in with a code; this path is for the dev login and
   * the debug backdoor.
   */
  if (!user.password_hash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await bcrypt.compare(dto.password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.mfa_enabled) {
    const { secret } = jwtConfig();
    const mfaToken = signMfaChallengeToken(user.id, user.email, secret);
    return { mfaRequired: true, userId: user.id, mfaToken };
  }

  const roles: string[] = user.roles.filter(Boolean);
  const tokens = await issueTokens(user.id, user.email, roles);
  return { userId: user.id, ...tokens };
}

/* -------------------------------------------------------------------------
 * Passwordless login
 *
 * A member types their email, we mail them six digits, they type the digits
 * back. There is no password, so there is nothing to reuse from a breach
 * elsewhere, nothing to reset, and nothing for us to store.
 *
 * The thing a six-digit code needs is discipline about the numbers around it:
 * how long it lives, how many guesses it survives, and how often one can be
 * asked for. Those three are the whole security model and they are all here.
 * ---------------------------------------------------------------------------
 */

/** Guesses allowed against one code before it is destroyed. */
const CODE_MAX_ATTEMPTS = 5;
/** Codes one address may request per window. */
const CODE_MAX_PER_EMAIL = 5;
/** Codes one IP may request per window, across all addresses. */
const CODE_MAX_PER_IP = 20;
const CODE_WINDOW_MINUTES = 15;

/**
 * Six digits from a CSPRNG.
 *
 * `randomInt` rather than `Math.random()`: the code is the only credential in
 * the system, and Math.random is seeded predictably enough that a stream of
 * codes leaks the next one. Padded, so "000123" stays six characters and the
 * comparison never has to think about length.
 */
function generateLoginCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Codes are compared as hashes, so a database read is never a way in. */
function hashCode(email: string, code: string) {
  // Salted with the address so an identical code for two people hashes
  // differently, and a stolen hash cannot be replayed against another account.
  return createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
}

async function withinRateLimits(email: string, ip: string | null) {
  const pool = getPool();
  const since = `now() - interval '${CODE_WINDOW_MINUTES} minutes'`;

  const byEmail = await pool.query(
    `SELECT count(*)::int AS n FROM ${auth}.login_codes
     WHERE email = $1 AND created_at > ${since}`,
    [email],
  );
  if (byEmail.rows[0].n >= CODE_MAX_PER_EMAIL) return false;

  // Counted in the database rather than in memory: the app runs as serverless
  // functions, so an in-process counter would reset on every cold start and
  // limit nothing.
  if (ip) {
    const byIp = await pool.query(
      `SELECT count(*)::int AS n FROM ${auth}.login_codes
       WHERE request_ip = $1 AND created_at > ${since}`,
      [ip],
    );
    if (byIp.rows[0].n >= CODE_MAX_PER_IP) return false;
  }

  return true;
}

/**
 * Send a login code, if that address has an account.
 *
 * Always resolves the same way whether or not the account exists. Telling an
 * anonymous caller "no account here" turns this endpoint into a membership
 * oracle for anyone with a list of email addresses, and the members are named
 * professionals. The caller returns one message either way.
 */
export async function connectProRequestLoginCode(dto: {
  email: string;
  ip?: string | null;
}): Promise<{ delivered: boolean; mailConfigured: boolean; debugCode?: string }> {
  if (!databaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  await ensureAuthSchema();

  const email = dto.email.trim().toLowerCase();
  const ip = dto.ip?.trim() || null;
  const pool = getPool();
  // Safe to expose: whether Resend is wired up, not whether this address exists.
  const mailConfigured = isEmailConfigured();

  if (!(await withinRateLimits(email, ip))) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many codes requested. Try again in a few minutes.",
      429,
    );
  }

  const user = await pool.query(
    `SELECT id, status FROM ${auth}.users WHERE email = $1 AND deleted_at IS NULL`,
    [email],
  );

  // No account, or a suspended one. Still record a rate-limit row so unknown
  // addresses hit 429 the same way known ones do — otherwise "never rate
  // limited" becomes a membership oracle.
  if (user.rows.length === 0 || user.rows[0].status !== "active") {
    const decoyExpires = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    await pool.query(
      `INSERT INTO ${auth}.login_codes (email, code_hash, expires_at, request_ip, consumed_at)
       VALUES ($1, $2, $3, $4, now())`,
      [email, hashCode(email, `decoy:${randomBytes(16).toString("hex")}`), decoyExpires, ip],
    );
    return { delivered: false, mailConfigured };
  }

  const code = generateLoginCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  // Asking for a new code kills the old one. Two live codes doubles the number
  // of valid guesses, and someone who requested twice is reading the newest
  // mail anyway.
  await pool.query(
    `UPDATE ${auth}.login_codes SET consumed_at = now()
     WHERE email = $1 AND consumed_at IS NULL`,
    [email],
  );

  await pool.query(
    `INSERT INTO ${auth}.login_codes (email, code_hash, expires_at, request_ip)
     VALUES ($1, $2, $3, $4)`,
    [email, hashCode(email, code), expiresAt, ip],
  );

  await sendLoginCode({ to: email, code });

  return {
    delivered: true,
    mailConfigured,
    ...(canRevealCode() ? { debugCode: code } : {}),
  };
}

/**
 * Exchange a code for a session.
 *
 * One error message for every failure — wrong code, expired code, already-used
 * code, no such account. Distinguishing them would let someone with a list of
 * addresses learn which ones are members by reading the difference.
 */
export async function connectProVerifyLoginCode(dto: { email: string; code: string }) {
  if (!databaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  await ensureAuthSchema();

  const email = dto.email.trim().toLowerCase();
  const code = dto.code.trim();
  const pool = getPool();
  const wrong = () => new UnauthorizedError("That code is not right, or it has expired.");

  const found = await pool.query(
    `SELECT id, code_hash, attempts FROM ${auth}.login_codes
     WHERE email = $1 AND consumed_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC
     LIMIT 1`,
    [email],
  );
  if (found.rows.length === 0) throw wrong();

  const row = found.rows[0];

  // Counted before it is checked. If the attempt is recorded afterwards, a
  // caller who hangs up mid-request gets a free guess, and free guesses against
  // six digits are the entire attack.
  const attempts = await pool.query(
    `UPDATE ${auth}.login_codes SET attempts = attempts + 1
     WHERE id = $1 RETURNING attempts`,
    [row.id],
  );

  if (attempts.rows[0].attempts > CODE_MAX_ATTEMPTS) {
    await pool.query(`UPDATE ${auth}.login_codes SET consumed_at = now() WHERE id = $1`, [
      row.id,
    ]);
    throw wrong();
  }

  const expected = Buffer.from(row.code_hash, "utf8");
  const given = Buffer.from(hashCode(email, code), "utf8");
  // Both are hex sha256, so they are always the same length and
  // timingSafeEqual cannot throw. Compared this way rather than with === so the
  // time taken does not describe how much of the code was right.
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    throw wrong();
  }

  // Single use, marked before the session is issued.
  await pool.query(`UPDATE ${auth}.login_codes SET consumed_at = now() WHERE id = $1`, [
    row.id,
  ]);

  const result = await pool.query(
    `SELECT u.id, u.email, u.status, array_agg(r.role) AS roles
     FROM ${auth}.users u
     LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
     WHERE u.email = $1 AND u.deleted_at IS NULL
     GROUP BY u.id`,
    [email],
  );
  if (result.rows.length === 0) throw wrong();

  const user = result.rows[0];
  if (user.status !== "active") {
    throw new UnauthorizedError("Account is suspended or banned");
  }

  // Reaching a code sent to that address is the proof the address is theirs.
  await pool
    .query(`UPDATE ${auth}.users SET email_verified = true WHERE id = $1`, [user.id])
    .catch(() => undefined);

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

export async function connectProVerifyMfa(mfaToken: string, code: string) {
  if (!databaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }

  const { secret } = jwtConfig();
  let challenge: { sub: string; email: string };
  try {
    challenge = verifyMfaChallengeToken(mfaToken, secret);
  } catch {
    throw new UnauthorizedError("Invalid or expired MFA challenge");
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT u.id, u.email, u.mfa_secret, array_agg(r.role) as roles
     FROM ${auth}.users u
     LEFT JOIN ${auth}.user_roles r ON r.user_id = u.id
     WHERE u.id = $1 AND u.mfa_enabled = true AND u.deleted_at IS NULL
     GROUP BY u.id`,
    [challenge.sub],
  );

  if (result.rows.length === 0) {
    throw new NotFoundError("User not found or MFA not enabled");
  }

  const user = result.rows[0];
  if (!user.mfa_secret || typeof user.mfa_secret !== "string") {
    throw new UnauthorizedError("MFA is not configured for this account");
  }
  if (!verifyTotp(user.mfa_secret, code)) {
    throw new UnauthorizedError("Invalid MFA code");
  }

  const roles: string[] = user.roles.filter(Boolean);
  const tokens = await issueTokens(user.id, user.email, roles);
  return { userId: user.id, ...tokens };
}

export function toAuthErrorResponse(error: unknown, step = "auth"): { status: number; body: AuthErrorDetail } {
  const info = formatAuthError(error, step);

  /**
   * Every AppError already knows its own status, so read it rather than
   * enumerating subclasses.
   *
   * The list this replaced named Conflict, Unauthorized and NotFound and fell
   * through to 500 for everything else — so the rate limiter, which is an
   * AppError carrying 429, reported a working defence as a server error.
   * Anything that counts 5xx would have paged on it.
   */
  if (error instanceof AppError) {
    const status = error.statusCode;
    return {
      status,
      // The diagnostic hints all describe database and environment
      // misconfiguration. On a 4xx the caller did something we are declining,
      // and telling them to check Vercel env vars is noise at best and
      // misleading at worst.
      body: status < 500 ? { ...info, hint: undefined } : info,
    };
  }

  return { status: 500, body: info };
}
