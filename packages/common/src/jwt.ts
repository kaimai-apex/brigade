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
  return jwt.verify(token, secret, VERIFY_OPTS) as JwtPayload;
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

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}
