import type {
  Association,
  Bbox,
  JobListing,
  MapPin,
  Neighbourhood,
  NewsItem,
  Restaurant,
  School,
  Supplier,
} from "./types";

/**
 * Client for explore-service (via the api-gateway).
 * Restaurants: OSM + curated, Postgres-backed with read-through ingest.
 * Directory: schools / associations / suppliers / news / job-listings /
 * neighbourhoods — curated seed, auto-seeded on first empty read.
 */

const API_BASE =
  process.env.EXPLORE_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";

export type RestaurantQuery = {
  bbox: Bbox;
  cuisine?: string;
  price?: string;
  accolade?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type RestaurantPage = {
  restaurants: Restaurant[];
  total: number;
  page: number;
  limit: number;
  attribution: string;
  ok: boolean;
};

const EMPTY_RESTAURANTS: RestaurantPage = {
  restaurants: [],
  total: 0,
  page: 1,
  limit: 60,
  attribution: "",
  ok: false,
};

function mapRestaurant(row: Record<string, unknown>): Restaurant {
  return {
    id: String(row.id ?? row.slug),
    slug: String(row.slug),
    name: String(row.name),
    lat: Number(row.lat),
    lng: Number(row.lng),
    neighbourhood: (row.neighbourhood as string) ?? undefined,
    address: (row.address as string) ?? undefined,
    cuisineTags: (row.cuisineTags as string[]) ?? [],
    priceLevel: (row.priceLevel as Restaurant["priceLevel"]) ?? undefined,
    accolades: (row.accolades as Restaurant["accolades"]) ?? [],
    website: (row.website as string) ?? undefined,
    instagram: (row.instagram as string) ?? undefined,
    reservationUrl: (row.reservationUrl as string) ?? undefined,
    blurb: (row.blurb as string) ?? undefined,
    featured: Boolean(row.featured),
    source: (row.source as Restaurant["source"]) ?? "osm",
    osmType: (row.osmType as Restaurant["osmType"]) ?? undefined,
    osmId: (row.osmId as number) ?? undefined,
    externalUrl: (row.externalUrl as string) ?? undefined,
    claimedByUserId: (row.claimedByUserId as string) ?? null,
  };
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchRestaurants(
  query: RestaurantQuery,
): Promise<RestaurantPage> {
  const p = new URLSearchParams();
  const { bbox } = query;
  p.set("bbox", `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`);
  if (query.cuisine) p.set("cuisine", query.cuisine);
  if (query.price) p.set("price", query.price);
  if (query.accolade) p.set("accolade", query.accolade);
  if (query.q) p.set("q", query.q);
  p.set("page", String(query.page ?? 1));
  p.set("limit", String(query.limit ?? 60));

  const json = await getJson<{
    data?: Record<string, unknown>[];
    total?: number;
    page?: number;
    limit?: number;
    attribution?: string;
  }>(`/api/v1/restaurants?${p.toString()}`);

  if (!json) return EMPTY_RESTAURANTS;
  return {
    restaurants: (json.data ?? []).map(mapRestaurant),
    total: json.total ?? 0,
    page: json.page ?? 1,
    limit: json.limit ?? 60,
    attribution: json.attribution ?? "© OpenStreetMap contributors (ODbL)",
    ok: true,
  };
}

export async function fetchRestaurantBySlug(
  slug: string,
): Promise<Restaurant | null> {
  const row = await getJson<Record<string, unknown>>(
    `/api/v1/restaurants/${slug}`,
  );
  return row ? mapRestaurant(row) : null;
}

type Page<T> = { data: T[]; total: number; page: number; limit: number; ok: boolean };

function emptyPage<T>(): Page<T> {
  return { data: [], total: 0, page: 1, limit: 100, ok: false };
}

async function fetchExploreList<T>(
  path: string,
  map: (row: Record<string, unknown>) => T,
  params?: URLSearchParams,
): Promise<Page<T>> {
  const qs = params?.toString();
  const json = await getJson<{
    data?: Record<string, unknown>[];
    total?: number;
    page?: number;
    limit?: number;
  }>(`/api/v1/explore/${path}${qs ? `?${qs}` : ""}`);
  if (!json) return emptyPage();
  return {
    data: (json.data ?? []).map(map),
    total: json.total ?? 0,
    page: json.page ?? 1,
    limit: json.limit ?? 100,
    ok: true,
  };
}

function bboxParam(bbox?: Bbox): URLSearchParams {
  const p = new URLSearchParams();
  if (bbox) p.set("bbox", `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`);
  return p;
}

export async function fetchSchools(opts: {
  bbox?: Bbox;
  city?: string;
  program?: string;
  q?: string;
  limit?: number;
} = {}): Promise<Page<School>> {
  const p = bboxParam(opts.bbox);
  if (opts.city) p.set("city", opts.city);
  if (opts.program) p.set("program", opts.program);
  if (opts.q) p.set("q", opts.q);
  if (opts.limit) p.set("limit", String(opts.limit));
  return fetchExploreList(
    "schools",
    (row) =>
      ({
        id: String(row.id ?? row.slug),
        slug: String(row.slug),
        name: String(row.name),
        city: String(row.city),
        lat: Number(row.lat),
        lng: Number(row.lng),
        programs: (row.programs as string[]) ?? [],
        credential: String(row.credential),
        website: String(row.website),
        blurb: String(row.blurb),
      }) satisfies School,
    p,
  );
}

export async function fetchAssociations(opts: {
  scope?: string;
  q?: string;
  limit?: number;
} = {}): Promise<Page<Association>> {
  const p = new URLSearchParams();
  if (opts.scope) p.set("scope", opts.scope);
  if (opts.q) p.set("q", opts.q);
  if (opts.limit) p.set("limit", String(opts.limit));
  return fetchExploreList(
    "associations",
    (row) =>
      ({
        id: String(row.id ?? row.slug),
        slug: String(row.slug),
        name: String(row.name),
        acronym: (row.acronym as string) ?? undefined,
        scope: row.scope as Association["scope"],
        website: String(row.website),
        role: String(row.role),
        blurb: String(row.blurb),
      }) satisfies Association,
    p,
  );
}

export async function fetchSuppliers(opts: {
  bbox?: Bbox;
  category?: string;
  region?: string;
  q?: string;
  limit?: number;
} = {}): Promise<Page<Supplier>> {
  const p = bboxParam(opts.bbox);
  if (opts.category) p.set("category", opts.category);
  if (opts.region) p.set("region", opts.region);
  if (opts.q) p.set("q", opts.q);
  if (opts.limit) p.set("limit", String(opts.limit));
  return fetchExploreList(
    "suppliers",
    (row) =>
      ({
        id: String(row.id ?? row.slug),
        slug: String(row.slug),
        name: String(row.name),
        categories: (row.categories as Supplier["categories"]) ?? [],
        regionsServed: (row.regionsServed as string[]) ?? [],
        website: String(row.website),
        phone: (row.phone as string) ?? undefined,
        lat: row.lat != null ? Number(row.lat) : undefined,
        lng: row.lng != null ? Number(row.lng) : undefined,
        description: String(row.description),
        claimed: Boolean(row.claimed),
      }) satisfies Supplier,
    p,
  );
}

export async function fetchNews(opts: {
  tag?: string;
  q?: string;
  limit?: number;
} = {}): Promise<Page<NewsItem>> {
  const p = new URLSearchParams();
  if (opts.tag) p.set("tag", opts.tag);
  if (opts.q) p.set("q", opts.q);
  if (opts.limit) p.set("limit", String(opts.limit));
  return fetchExploreList(
    "news",
    (row) =>
      ({
        id: String(row.id),
        title: String(row.title),
        snippet: String(row.snippet),
        source: String(row.source),
        sourceUrl: String(row.sourceUrl),
        url: String(row.url),
        publishedAt: String(row.publishedAt),
        tags: (row.tags as NewsItem["tags"]) ?? [],
      }) satisfies NewsItem,
    p,
  );
}

export async function fetchJobListings(opts: {
  bbox?: Bbox;
  type?: string;
  neighbourhood?: string;
  employment?: string;
  q?: string;
  limit?: number;
} = {}): Promise<Page<JobListing>> {
  const p = bboxParam(opts.bbox);
  if (opts.type) p.set("type", opts.type);
  if (opts.neighbourhood) p.set("neighbourhood", opts.neighbourhood);
  if (opts.employment) p.set("employment", opts.employment);
  if (opts.q) p.set("q", opts.q);
  if (opts.limit) p.set("limit", String(opts.limit));
  return fetchExploreList(
    "job-listings",
    (row) =>
      ({
        id: String(row.id),
        title: String(row.title),
        employer: String(row.employer),
        neighbourhood: String(row.neighbourhood),
        type: row.type as JobListing["type"],
        employment: String(row.employment),
        compensation: (row.compensation as string) ?? undefined,
        source: String(row.source),
        url: String(row.url),
        postedAt: String(row.postedAt),
      }) satisfies JobListing,
    p,
  );
}

export async function fetchNeighbourhoods(opts: {
  bbox?: Bbox;
  q?: string;
  limit?: number;
} = {}): Promise<Page<Neighbourhood>> {
  const p = bboxParam(opts.bbox);
  if (opts.q) p.set("q", opts.q);
  if (opts.limit) p.set("limit", String(opts.limit));
  return fetchExploreList(
    "neighbourhoods",
    (row) =>
      ({
        slug: String(row.slug),
        name: String(row.name),
        lat: Number(row.lat),
        lng: Number(row.lng),
      }) satisfies Neighbourhood,
    p,
  );
}

export async function fetchMapPins(bbox?: Bbox): Promise<MapPin[]> {
  const p = bboxParam(bbox);
  const json = await getJson<{ data?: MapPin[] }>(
    `/api/v1/explore/map-pins${p.toString() ? `?${p}` : ""}`,
  );
  return json?.data ?? [];
}
