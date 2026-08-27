/**
 * Kitchen-themed default profile art.
 * Includes landing-page chef photos + illustrated kitchen icons.
 * Assignment is stable per userId so the same person always gets the same art.
 */

/** Square JPEG we store for every uploaded profile photo. */
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const AVATAR_UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const AVATAR_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Client-side check before we hit the upload route. */
export function avatarFileError(file: File): string | null {
  const heic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.hei[cf]$/i.test(file.name);
  if (heic) {
    return "Use a JPEG, PNG, or WebP. iPhone: Camera → Format → Most Compatible.";
  }
  const namedOk = /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  if ((file.type && !AVATAR_MIME.has(file.type) && !namedOk) || (!file.type && !namedOk)) {
    return `Use a JPEG, PNG, WebP, or GIF. We'll square it to ${AVATAR_OUTPUT_SIZE}×${AVATAR_OUTPUT_SIZE}.`;
  }
  if (file.size > AVATAR_MAX_UPLOAD_BYTES) {
    return "Photo is too large (max 10 MB).";
  }
  return null;
}

export const DEFAULT_AVATARS = [
  "/avatars/chef-chef.png",
  "/avatars/chef-bartender.png",
  "/avatars/chef-cook.png",
  "/avatars/chef-cutlery.png",
  "/avatars/avatar-toque-whisk.png",
  "/avatars/avatar-bar-glass.png",
  "/avatars/avatar-knife-board.png",
  "/avatars/avatar-saucepan.png",
  "/avatars/avatar-plates.png",
  "/avatars/avatar-baking.png",
] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Deterministic kitchen avatar for a user (or any stable id / email / name). */
export function getDefaultAvatar(seed?: string | null): string {
  const key = (seed ?? "brigade").trim() || "brigade";
  const index = hashSeed(key) % DEFAULT_AVATARS.length;
  return DEFAULT_AVATARS[index];
}

/**
 * A same-origin image this app re-encoded itself.
 *
 * Two shapes are accepted:
 *   /api/media/<uuid>.jpg        — current, database-backed (migration 019)
 *   /uploads/<uuid>/<uuid>.jpg   — legacy filesystem writes
 *
 * The legacy shape stays recognised so existing local uploads keep rendering.
 * It was never reachable on the deployed site, where the write failed outright,
 * so there is no production data in that shape to migrate.
 *
 * Only `.jpg` passes: every uploaded image goes through sharp and comes out
 * JPEG, so any other extension means the file skipped that pipeline (which is
 * how a cover-upload-then-avatarUrl-swap would smuggle in a GIF or SVG).
 *
 * Defined here rather than imported from a shared module because this file is
 * loaded directly by spec/avatar-image.ts under `node --experimental-strip-types`,
 * which resolves relative imports only when they carry a ".ts" extension — and
 * the app, bundled by Next, must not use those specifiers. lib/banners.ts keeps
 * its own copy for the same reason.
 */
export function isStoredImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.includes("..") || trimmed.includes("//")) return false;
  return (
    /^\/api\/media\/[0-9a-f-]{36}\.jpg$/i.test(trimmed) ||
    /^\/uploads\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i.test(trimmed)
  );
}

/**
 * Same-origin uploads only — never echo arbitrary http(s) URLs from profile
 * fields (stored XSS / tracking-pixel risk). Falls back to kitchen defaults.
 */
export function isSafeAvatarUrl(url: string): boolean {
  if (isStoredImageUrl(url)) return true;
  if ((DEFAULT_AVATARS as readonly string[]).includes(url)) return true;
  return false;
}

/** Uploaded photo if present and safe, otherwise a kitchen default avatar. */
export function resolveAvatarUrl(
  uploadedUrl?: string | null,
  seed?: string | null,
): string {
  const trimmed = uploadedUrl?.trim();
  if (trimmed && isSafeAvatarUrl(trimmed)) return trimmed;
  return getDefaultAvatar(seed);
}
