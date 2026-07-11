/**
 * OpenStreetMap Overpass client for server-side ingestion. Free, keyless,
 * global, ODbL (storable with attribution). Overpass returns HTTP 406 without
 * a User-Agent, so we always send one.
 */

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const USER_AGENT =
  'BrigadeHospitality/1.0 (+https://brigade.app; hospitality network directory)';

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';

export type Bbox = { south: number; west: number; north: number; east: number };

export type OsmRestaurant = {
  osmType: 'node' | 'way';
  osmId: number;
  name: string;
  lat: number;
  lng: number;
  neighbourhood?: string;
  address?: string;
  city?: string;
  cuisineTags: string[];
  website?: string;
  externalUrl: string;
};

type OverpassElement = {
  type: 'node' | 'way' | 'relation';
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
        .map((s) => s.trim().replace(/_/g, ' '))
        .filter(Boolean)
        .map(titleCase),
    ),
  ].slice(0, 5);
}

function toOsm(el: OverpassElement): OsmRestaurant | null {
  const t = el.tags ?? {};
  const name = t.name ?? t['name:en'];
  if (!name) return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) return null;

  const website = t.website ?? t['contact:website'] ?? t.url ?? undefined;
  const address = [t['addr:housenumber'], t['addr:street']]
    .filter(Boolean)
    .join(' ');

  return {
    osmType: el.type === 'way' ? 'way' : 'node',
    osmId: el.id,
    name,
    lat,
    lng,
    neighbourhood:
      t['addr:suburb'] ??
      t['addr:neighbourhood'] ??
      t['addr:quarter'] ??
      t['addr:district'] ??
      undefined,
    address: address || undefined,
    city: t['addr:city'] ?? undefined,
    cuisineTags: parseCuisine(t.cuisine),
    website,
    externalUrl: website ?? `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

function buildQuery(b: Bbox, limit: number): string {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  return (
    `[out:json][timeout:30];` +
    `(node["amenity"="restaurant"](${bbox});` +
    `way["amenity"="restaurant"](${bbox}););` +
    `out center ${limit};`
  );
}

export async function fetchOsmRestaurants(
  bbox: Bbox,
  limit = 800,
): Promise<OsmRestaurant[]> {
  const query = buildQuery(bbox, limit);
  for (const endpoint of ENDPOINTS) {
    const url = `${endpoint}?data=${encodeURIComponent(query)}`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: OverpassElement[] };
      const seen = new Set<string>();
      const out: OsmRestaurant[] = [];
      for (const el of json.elements ?? []) {
        const r = toOsm(el);
        if (!r) continue;
        const key = `${r.name.toLowerCase()}|${r.lat.toFixed(4)}|${r.lng.toFixed(4)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
      }
      return out;
    } catch {
      // try next endpoint
    }
  }
  return [];
}
