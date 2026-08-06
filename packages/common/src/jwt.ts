import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  purpose?: string;
}

const VERIFY_OPTS: jwt.VerifyOptions = { algorithms: ['HS256'] };

export function signAccessToken(
  payload: JwtPayload,
  secret: string,
  expiresIn: string,
): string {
  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  const payload = jwt.verify(token, secret, VERIFY_OPTS) as JwtPayload;
  // MFA challenge tokens share the same signing key but must never be treated
  // as a logged-in session — they only prove "password ok, enter TOTP next".
  if (payload.purpose === "mfa") {
    throw new Error("MFA challenge is not an access token");
  }
  return payload;
}

/** Short-lived challenge after password OK when MFA is enabled. */
export function signMfaChallengeToken(
  userId: string,
  email: string,
  secret: string,
): string {
  return jwt.sign(
    { sub: userId, email, roles: [], purpose: 'mfa' },
    secret,
    { expiresIn: '5m', algorithm: 'HS256' } as jwt.SignOptions,
  );
}

export function verifyMfaChallengeToken(
  token: string,
  secret: string,
): JwtPayload {
  const payload = jwt.verify(token, secret, VERIFY_OPTS) as JwtPayload;
  if (payload.purpose !== 'mfa') {
    throw new Error('Invalid MFA challenge');
  }
  return payload;
}

/**
 * @deprecated Never use for auth decisions — decode without verify. Prefer
 * verifyAccessToken. Kept only so accidental imports fail loudly at call sites
 * that still expect a helper; always returns null.
 */
export function decodeToken(_token: string): JwtPayload | null {
  return null;
}
