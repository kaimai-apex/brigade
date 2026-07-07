type NameFields = {
  first_name: string | null;
  last_name: string | null;
};

export function namesFromMetadata(
  metadata: Record<string, unknown> | undefined,
): NameFields {
  if (!metadata) return { first_name: null, last_name: null };

  const first =
    stringOrEmpty(metadata.first_name) ||
    stringOrEmpty(metadata.given_name);
  const last =
    stringOrEmpty(metadata.last_name) ||
    stringOrEmpty(metadata.family_name);

  if (first && last) {
    return { first_name: first, last_name: last };
  }

  const full =
    stringOrEmpty(metadata.full_name) || stringOrEmpty(metadata.name);

  if (!full) {
    return {
      first_name: first || null,
      last_name: last || null,
    };
  }

  const parts = full.split(/\s+/).filter(Boolean);
  return {
    first_name: first || parts[0] || null,
    last_name: last || parts.slice(1).join(" ") || null,
  };
}

function stringOrEmpty(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function hasDisplayName(firstName?: string | null, lastName?: string | null) {
  return Boolean(firstName?.trim() || lastName?.trim());
}
