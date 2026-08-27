import data from "./articles-data.json" with { type: "json" };

const EXTRA_SLUGS = ["journal", "roadmap"] as const;

const allowed = new Set<string>([
  ...EXTRA_SLUGS,
  ...(data as { slug: string }[]).map((article) => article.slug),
]);

/** Store only known resource keys. Unknown values become null, not a 400. */
export function sanitizeResourceSlug(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const slug = raw.trim().slice(0, 120);
  if (!slug || !allowed.has(slug)) return null;
  return slug;
}
