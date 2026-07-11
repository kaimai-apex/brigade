import type { Bbox, Restaurant } from "../types";

/**
 * OpenStreetMap Overpass API client — the live restaurant auto-loader.
 *
 * Free, keyless, global. Data is ODbL-licensed: we may cache and store it as
 * long as we attribute OpenStreetMap. We fetch per bounding box on demand (so
 * navigating to a location loads that area) and let Next's Data Cache hold the
 * result for ~a month before refetching (MD: "refresh once a month").
 *
 * Gotcha discovered in testing: Overpass returns HTTP 406 without a
 * User-Agent, so we always send one.
 */

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const USER_AGENT =
  "BrigadeHospitality/1.0 (+https://brigade.app; hospitality network directory)";

export const OSM_ATTRIBUTION = "© OpenStreetMap contributors (ODbL)";

/** ~30 days, in seconds. */
const MONTHLY = 60 * 60 * 24 * 30;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseCuisine(raw?: string): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[;,]/)
        .map((s) => s.trim().replace(/_/g, " "))
        .filter(Boolean)
        .map(titleCase),
    ),
  ].slice(0, 5);
}

function toRestaurant(el: OverpassElement): Restaurant | null {
  const t = el.tags ?? {};
  const name = t.name ?? t["name:en"];
  if (!name) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;

  const website =
    t.website ?? t["contact:website"] ?? t.url ?? undefined;
  const address = [t["addr:housenumber"], t["addr:street"]]
    .filter(Boolean)
    .join(" ");
  const neighbourhood =
    t["addr:suburb"] ??
    t["addr:neighbourhood"] ??
    t["addr:quarter"] ??
    t["addr:district"] ??
    undefined;

  return {
    id: `osm-${el.type}-${el.id}`,
    slug: `osm-${el.id}`,
    name,
    lat,
    lng,
    neighbourhood,
    address: address || undefined,
    cuisineTags: parseCuisine(t.cuisine),
    accolades: [],
    website,
    source: "osm",
    osmType: el.type === "way" ? "way" : "node",
    osmId: el.id,
    externalUrl:
      website ?? `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

function buildQuery(b: Bbox, limit: number): string {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  // Restaurants are usually nodes; include ways (buildings) via `out center`.
  return (
    `[out:json][timeout:30];` +
    `(node["amenity"="restaurant"](${bbox});` +
    `way["amenity"="restaurant"](${bbox}););` +
    `out center ${limit};`
  );
}

export type FetchResult = {
  restaurants: Restaurant[];
  attribution: string;
  ok: boolean;
};

/**
 * Load every named restaurant in `bbox` from OpenStreetMap. Result is cached by
 * Next for ~a month and tagged `osm-restaurants` (call `revalidateTag` to force
 * a refresh). Fails soft to an empty list if every endpoint is unreachable.
 */
export async function fetchRestaurantsInBbox(
  bbox: Bbox,
  opts: { limit?: number } = {},
): Promise<FetchResult> {
  const limit = opts.limit ?? 800;
  const query = buildQuery(bbox, limit);

  for (const endpoint of ENDPOINTS) {
    const url = `${endpoint}?data=${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        next: { revalidate: MONTHLY, tags: ["osm-restaurants"] },
      });
      if (!res.ok) continue;

      const json = (await res.json()) as { elements?: OverpassElement[] };
      const elements = json.elements ?? [];

      const seen = new Set<string>();
      const restaurants: Restaurant[] = [];
      for (const el of elements) {
        const r = toRestaurant(el);
        if (!r) continue;
        // Dedupe node+way duplicates of the same venue by name + rough coords.
        const key = `${r.name.toLowerCase()}|${r.lat.toFixed(4)}|${r.lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        restaurants.push(r);
      }
      return { restaurants, attribution: OSM_ATTRIBUTION, ok: true };
    } catch {
      // try next endpoint
    }
  }

  return { restaurants: [], attribution: OSM_ATTRIBUTION, ok: false };
}
