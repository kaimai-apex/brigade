/**
 * Kitchen-themed default profile art.
 * Includes landing-page chef photos + illustrated kitchen icons.
 * Assignment is stable per userId so the same person always gets the same art.
 */

export const DEFAULT_AVATARS = [
  "/avatars/chef-chef.jpg",
  "/avatars/chef-bartender.jpg",
  "/avatars/chef-cook.jpg",
  "/avatars/chef-cutlery.jpg",
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

/** Uploaded photo if present, otherwise a kitchen default avatar. */
export function resolveAvatarUrl(
  uploadedUrl?: string | null,
  seed?: string | null,
): string {
  const trimmed = uploadedUrl?.trim();
  if (trimmed) return trimmed;
  return getDefaultAvatar(seed);
}
