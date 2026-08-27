import bcrypt from "bcryptjs";

/**
 * bcrypt of the shared portal password. Compared only on the server.
 * Override with ADMIN_PORTAL_PASSWORD_HASH if this ever needs to rotate
 * without a code change.
 */
const FALLBACK_HASH =
  "$2b$12$b.IYoi/Q6VINPQIzhWpxQ.uolxDJ3i5rDuWUjPI5NOldxxQwCuRfq";

export async function adminPortalPasswordMatches(raw: unknown): Promise<boolean> {
  if (typeof raw !== "string" || !raw) return false;
  const hash = process.env.ADMIN_PORTAL_PASSWORD_HASH?.trim() || FALLBACK_HASH;
  try {
    return await bcrypt.compare(raw, hash);
  } catch {
    return false;
  }
}
