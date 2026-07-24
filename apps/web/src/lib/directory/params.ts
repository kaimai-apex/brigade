import type { Profile } from "@/lib/types/database";

/** Directory query params — the shared contract between URL, server action, and API. */
export type DirectoryParams = {
  q?: string;
  role?: string;
  expertise?: string[];
  city?: string;
  state?: string;
  country?: string;
  openToWork?: boolean;
  emergency?: boolean;
  privateEvents?: boolean;
  contract?: boolean;
  minYears?: number;
  hasPhoto?: boolean;
  sort?: DirectorySort;
  limit?: number;
  offset?: number;
};

export type DirectorySort =
  | "recent"
  | "newest"
  | "name"
  | "experience"
  | "complete";

export type DirectoryFacet = {
  value: string;
  count: number;
  state?: string | null;
};
export type DirectoryFacets = {
  roles: DirectoryFacet[];
  cities: DirectoryFacet[];
  expertise: DirectoryFacet[];
};
export type DirectoryResult = {
  profiles: Profile[];
  total: number;
  limit: number;
  offset: number;
  facets: DirectoryFacets;
};

export const SORT_OPTIONS: { value: DirectorySort; label: string }[] = [
  { value: "recent", label: "Recently active" },
  { value: "newest", label: "Newest members" },
  { value: "name", label: "Name (A–Z)" },
  { value: "experience", label: "Most experience" },
  { value: "complete", label: "Most complete" },
];

export const EXPERIENCE_BANDS: { value: number; label: string }[] = [
  { value: 1, label: "1+ years" },
  { value: 3, label: "3+ years" },
  { value: 5, label: "5+ years" },
  { value: 10, label: "10+ years" },
];

export const DIRECTORY_PAGE_SIZE = 24;

/** Maps a directory row from the user-service (camelCase) into the web `Profile` shape. */
export function mapDirectoryRow(row: Record<string, unknown>): Profile {
  return {
    id: String(row.userId ?? row.id),
    first_name: String(row.firstName ?? ""),
    last_name: String(row.lastName ?? ""),
    headline: (row.headline as string) ?? null,
    city: (row.city as string) ?? null,
    state: (row.state as string) ?? null,
    country: (row.country as string) ?? null,
    profile_image_url:
      (row.profileImageUrl as string) ?? (row.avatarUrl as string) ?? null,
    role: (row.role as string) ?? "Chef",
    expertise_areas: (row.expertiseAreas as string[]) ?? [],
    years_experience:
      typeof row.yearsExperience === "number" ? row.yearsExperience : null,
    open_to_opportunities: Boolean(row.openToOpportunities),
    available_private_events: Boolean(row.availablePrivateEvents),
    available_contract_work: Boolean(row.availableContractWork),
    available_emergency_staffing: Boolean(row.availableEmergencyStaffing),
    created_at: (row.createdAt as string) ?? "",
    onboarding_completed: true,
  } as Profile;
}

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function read(sp: RawParams, key: string): string | undefined {
  if (sp instanceof URLSearchParams) return sp.get(key) ?? undefined;
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

const truthy = (v?: string) => v === "true" || v === "1";

/** Parse URL search params (Next server `searchParams` or a URLSearchParams) into typed params. */
export function parseDirectoryParams(sp: RawParams): DirectoryParams {
  const expertiseRaw = read(sp, "expertise");
  const sort = read(sp, "sort") as DirectorySort | undefined;
  const minYears = read(sp, "minYears");
  return {
    q: read(sp, "q") || undefined,
    role: read(sp, "role") || undefined,
    expertise: expertiseRaw
      ? expertiseRaw.split(",").map((v) => v.trim()).filter(Boolean)
      : undefined,
    city: read(sp, "city") || undefined,
    state: read(sp, "state") || undefined,
    country: read(sp, "country") || undefined,
    openToWork: truthy(read(sp, "openToWork")) || undefined,
    emergency: truthy(read(sp, "emergency")) || undefined,
    privateEvents: truthy(read(sp, "privateEvents")) || undefined,
    contract: truthy(read(sp, "contract")) || undefined,
    hasPhoto: truthy(read(sp, "hasPhoto")) || undefined,
    minYears: minYears ? Number(minYears) : undefined,
    sort:
      sort && SORT_OPTIONS.some((o) => o.value === sort) ? sort : undefined,
  };
}

/** Serialize typed params into a querystring (stable order, skips empty). */
export function directoryQueryString(params: DirectoryParams): string {
  const qs = new URLSearchParams();
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.role) qs.set("role", params.role);
  if (params.expertise?.length) qs.set("expertise", params.expertise.join(","));
  if (params.city) qs.set("city", params.city);
  if (params.state) qs.set("state", params.state);
  if (params.country) qs.set("country", params.country);
  if (params.openToWork) qs.set("openToWork", "true");
  if (params.emergency) qs.set("emergency", "true");
  if (params.privateEvents) qs.set("privateEvents", "true");
  if (params.contract) qs.set("contract", "true");
  if (params.hasPhoto) qs.set("hasPhoto", "true");
  if (typeof params.minYears === "number") qs.set("minYears", String(params.minYears));
  if (params.sort) qs.set("sort", params.sort);
  if (typeof params.limit === "number") qs.set("limit", String(params.limit));
  if (typeof params.offset === "number") qs.set("offset", String(params.offset));
  return qs.toString();
}

/** Count of active filters (for the mobile "Filters (n)" badge). */
export function countActiveFilters(params: DirectoryParams): number {
  let n = 0;
  if (params.role) n++;
  if (params.expertise?.length) n += params.expertise.length;
  if (params.city) n++;
  if (params.openToWork) n++;
  if (params.emergency) n++;
  if (params.privateEvents) n++;
  if (params.contract) n++;
  if (typeof params.minYears === "number") n++;
  if (params.hasPhoto) n++;
  return n;
}
