/**
 * Kitchen-themed default profile art.
 * Includes landing-page chef photos + illustrated kitchen icons.
 * Assignment is stable per userId so the same person always gets the same art.
 */

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
 * Same-origin uploads only — never echo arbitrary http(s) URLs from profile
 * fields (stored XSS / tracking-pixel risk). Falls back to kitchen defaults.
 */
export function isSafeAvatarUrl(url: string): boolean {
  if (url.startsWith("/uploads/") && !url.includes("..") && !url.includes("//")) {
    return /^\/uploads\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  }
  if ((DEFAULT_AVATARS as readonly string[]).includes(url)) return true;
  if (url.startsWith("/avatars/") && !url.includes("..")) return true;
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
