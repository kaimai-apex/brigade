import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Hex UUID / short id fragments must never appear as people names. */
const UUID_LIKE = /^[0-9a-f]{6,}(-[0-9a-f]{4,})*$/i;

export function looksLikeId(value?: string | null): boolean {
  if (!value) return true;
  const t = value.trim();
  if (!t) return true;
  return UUID_LIKE.test(t) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(t);
}

export function getInitials(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim().charAt(0) ?? "";
  const last = lastName?.trim().charAt(0) ?? "";
  const out = (first + last).toUpperCase();
  if (!out || looksLikeId(firstName) || looksLikeId(lastName)) return "?";
  return out;
}

export function formatLocation(
  city?: string | null,
  state?: string | null,
  country?: string | null,
) {
  return [city, state, country].filter(Boolean).join(", ");
}

/**
 * Human display name for people slots. Never returns a UUID/id fragment.
 * Falls back to "Brigade Member".
 */
export function displayName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName, lastName]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p) && !looksLikeId(p));
  return parts.join(" ") || "Brigade Member";
}

/** Prefer a resolved label; reject id-like strings. */
export function personLabel(
  ...candidates: Array<string | null | undefined>
): string {
  for (const c of candidates) {
    const t = c?.trim();
    if (t && !looksLikeId(t)) return t;
  }
  return "Brigade Member";
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Relative time for lists ("2h", "5d", "Jul 11"). */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** QA / debug seed accounts — hide from Discover, Feed, Companies by default. */
export function isTestOrDebugProfile(p: {
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  role?: string | null;
  headline?: string | null;
  name?: string | null;
}): boolean {
  const blob = [
    p.first_name,
    p.last_name,
    p.firstName,
    p.lastName,
    p.role,
    p.headline,
    p.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!blob) return true;
  return (
    /\b(debug|qa|test|administrator|redesign)\b/.test(blob) ||
    blob.includes("hospitality pulse")
  );
}

export function isTestOrDebugCompany(name?: string | null): boolean {
  if (!name) return false;
  return /\b(debug|qa|test|redesign)\b/i.test(name);
}
