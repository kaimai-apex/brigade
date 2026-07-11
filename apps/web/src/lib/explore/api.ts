import type { Bbox, Restaurant } from "./types";

/**
 * Client for the explore-service restaurant directory (via the api-gateway).
 * All filtering + pagination happens server-side in Postgres; the service also
 * live-ingests un-covered areas from OpenStreetMap on first request.
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

const EMPTY: RestaurantPage = {
  restaurants: [],
  total: 0,
  page: 1,
  limit: 60,
  attribution: "",
  ok: false,
};

function mapRow(row: Record<string, unknown>): Restaurant {
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

  try {
    const res = await fetch(`${API_BASE}/api/v1/restaurants?${p.toString()}`, {
      // The service caches OSM in Postgres; we always want the freshest page.
      cache: "no-store",
    });
    if (!res.ok) return EMPTY;
    const json = (await res.json()) as {
      data?: Record<string, unknown>[];
      total?: number;
      page?: number;
      limit?: number;
      attribution?: string;
    };
    return {
      restaurants: (json.data ?? []).map(mapRow),
      total: json.total ?? 0,
      page: json.page ?? 1,
      limit: json.limit ?? 60,
      attribution: json.attribution ?? "© OpenStreetMap contributors (ODbL)",
      ok: true,
    };
  } catch {
    return EMPTY;
  }
}

export async function fetchRestaurantBySlug(
  slug: string,
): Promise<Restaurant | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/restaurants/${slug}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return mapRow((await res.json()) as Record<string, unknown>);
  } catch {
    return null;
  }
}
