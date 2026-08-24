function asHttpUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function normalizeInstagramUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  let candidate: string;
  if (/^https?:\/\//i.test(trimmed)) {
    candidate = trimmed;
  } else if (trimmed.startsWith("@")) {
    candidate = `https://instagram.com/${trimmed.slice(1)}`;
  } else if (/instagram\.com/i.test(trimmed)) {
    candidate = `https://${trimmed.replace(/^\/\//, "")}`;
  } else if (/^[a-z0-9._]+$/i.test(trimmed)) {
    candidate = `https://instagram.com/${trimmed.replace(/^@/, "")}`;
  } else {
    candidate = `https://${trimmed}`;
  }
  return asHttpUrl(candidate);
}

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/\//, "")}`;
  return asHttpUrl(withScheme);
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
