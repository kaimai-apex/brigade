export function normalizeInstagramUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (trimmed.startsWith("@")) {
    return `https://instagram.com/${trimmed.slice(1)}`;
  }

  if (/instagram\.com/i.test(trimmed)) {
    return trimmed.startsWith("http") ? trimmed : `https://${trimmed.replace(/^\/\//, "")}`;
  }

  if (/^[a-z0-9._]+$/i.test(trimmed)) {
    return `https://instagram.com/${trimmed.replace(/^@/, "")}`;
  }

  return `https://${trimmed}`;
}

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/\//, "")}`;
}

/** @deprecated Use normalizeInstagramUrl or normalizeWebsiteUrl */
export function normalizeExternalUrl(raw: string): string {
  return normalizeWebsiteUrl(raw);
}

export function formatInstagramLabel(url: string): string {
  const normalized = normalizeInstagramUrl(url);
  try {
    const handle = new URL(normalized).pathname.replace(/^\//, "").split("/")[0];
    return handle ? `@${handle}` : url;
  } catch {
    return url.startsWith("@") ? url : `@${url.replace(/^@/, "")}`;
  }
}

export function formatWebsiteLabel(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

export function formatEducationDates(
  startDate?: string | null,
  endDate?: string | null,
  graduationYear?: number | null,
): string | null {
  const format = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (startDate && endDate) return `${format(startDate)} – ${format(endDate)}`;
  if (startDate) return `${format(startDate)} – Present`;
  if (endDate) return `Until ${format(endDate)}`;
  if (graduationYear) return String(graduationYear);
  return null;
}
