import type { Bbox, ExploreLocation } from "./types";

/**
 * Preset browsing locations. Each carries a bounding box that the Overpass
 * loader queries on demand, so clicking a location auto-loads every restaurant
 * in that area (MD §4.1 / §4.8). Toronto is the launch market; a handful of
 * other cities prove the "any location" model. Arbitrary places are reachable
 * via free-text geocoding (see geocode.ts).
 */
export const LOCATIONS: ExploreLocation[] = [
  {
    slug: "toronto-downtown",
    name: "Toronto — Downtown",
    region: "Ontario",
    lat: 43.6532,
    lng: -79.3832,
    bbox: { south: 43.638, west: -79.402, north: 43.668, east: -79.363 },
  },
  {
    slug: "toronto-west",
    name: "Toronto — West End",
    region: "Ontario",
    lat: 43.6489,
    lng: -79.42,
    bbox: { south: 43.638, west: -79.44, north: 43.662, east: -79.4 },
  },
  {
    slug: "toronto-midtown",
    name: "Toronto — Midtown & Yorkville",
    region: "Ontario",
    lat: 43.6795,
    lng: -79.395,
    bbox: { south: 43.668, west: -79.41, north: 43.695, east: -79.375 },
  },
  {
    slug: "toronto-east",
    name: "Toronto — East End",
    region: "Ontario",
    lat: 43.6659,
    lng: -79.345,
    bbox: { south: 43.652, west: -79.36, north: 43.682, east: -79.32 },
  },
  {
    slug: "montreal",
    name: "Montréal",
    region: "Quebec",
    lat: 45.5089,
    lng: -73.5617,
    bbox: { south: 45.5, west: -73.58, north: 45.525, east: -73.55 },
  },
  {
    slug: "vancouver",
    name: "Vancouver",
    region: "British Columbia",
    lat: 49.2827,
    lng: -123.1207,
    bbox: { south: 49.27, west: -123.14, north: 49.29, east: -123.1 },
  },
  {
    slug: "new-york",
    name: "New York City",
    region: "New York",
    lat: 40.7255,
    lng: -73.99,
    bbox: { south: 40.715, west: -74.005, north: 40.74, east: -73.975 },
  },
  {
    slug: "london",
    name: "London",
    region: "UK",
    lat: 51.514,
    lng: -0.134,
    bbox: { south: 51.508, west: -0.145, north: 51.52, east: -0.12 },
  },
];

export const DEFAULT_LOCATION_SLUG = "toronto-downtown";

export function getLocation(slug?: string | null): ExploreLocation | undefined {
  if (!slug) return undefined;
  return LOCATIONS.find((l) => l.slug === slug);
}

export function getDefaultLocation(): ExploreLocation {
  return getLocation(DEFAULT_LOCATION_SLUG) ?? LOCATIONS[0];
}

/** Build a bbox roughly `km` in each direction from a centre point. */
export function bboxAround(lat: number, lng: number, km = 2): Bbox {
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return {
    south: lat - dLat,
    west: lng - dLng,
    north: lat + dLat,
    east: lng + dLng,
  };
}

/** True when a point falls inside a bbox. */
export function withinBbox(lat: number, lng: number, b: Bbox): boolean {
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}
