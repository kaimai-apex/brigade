import type { Bbox, Restaurant } from "../types";
import { RESTAURANTS as CURATED } from "../restaurants";
import { withinBbox } from "../locations";

/**
 * Curated accolades (Michelin, Canada's 100 Best, local press) don't exist in
 * OpenStreetMap. This overlays our hand-curated prestige data onto the live OSM
 * results: match by normalised name + proximity, enrich in place, and inject
 * any curated venue that OSM is missing so a starred room never disappears.
 */

function normName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/['’`]/g, "")
    .replace(/\b(restaurant|the|toronto|kitchen|bar|co|cafe|caf)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Rough metres between two coords (equirectangular approximation). */
function distanceM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000;
  const x =
    ((bLng - aLng) * Math.PI) / 180 * Math.cos(((aLat + bLat) / 2 * Math.PI) / 180);
  const y = ((bLat - aLat) * Math.PI) / 180;
  return Math.sqrt(x * x + y * y) * R;
}

function enrich(osm: Restaurant, curated: Restaurant): Restaurant {
  return {
    ...osm,
    // Curated wins for editorial fields; OSM keeps live coords/address.
    accolades: curated.accolades,
    featured: curated.featured,
    blurb: curated.blurb ?? osm.blurb,
    priceLevel: curated.priceLevel ?? osm.priceLevel,
    neighbourhood: curated.neighbourhood ?? osm.neighbourhood,
    instagram: curated.instagram ?? osm.instagram,
    reservationUrl: curated.reservationUrl ?? osm.reservationUrl,
    website: osm.website ?? curated.website,
    cuisineTags: osm.cuisineTags.length ? osm.cuisineTags : curated.cuisineTags,
    // Route matched venues to their rich curated detail page.
    slug: curated.slug,
    source: "curated",
    claimedByUserId: curated.claimedByUserId ?? null,
  };
}

/** Rank: featured first, then any accolade, then has-website, then name. */
function rank(a: Restaurant, b: Restaurant): number {
  const score = (r: Restaurant) =>
    (r.featured ? 100 : 0) +
    (r.accolades.length ? 40 : 0) +
    (r.website ? 5 : 0) +
    (r.cuisineTags.length ? 1 : 0);
  const d = score(b) - score(a);
  return d !== 0 ? d : a.name.localeCompare(b.name);
}

/**
 * Merge live OSM restaurants with curated accolades for the given bbox.
 */
export function mergeCurated(
  osm: Restaurant[],
  bbox: Bbox,
): Restaurant[] {
  const curatedInArea = CURATED.filter((c) => withinBbox(c.lat, c.lng, bbox));
  const matchedCurated = new Set<string>();

  const merged = osm.map((r) => {
    const nn = normName(r.name);
    const match = curatedInArea.find(
      (c) =>
        !matchedCurated.has(c.id) &&
        normName(c.name) === nn &&
        distanceM(r.lat, r.lng, c.lat, c.lng) < 600,
    );
    if (match) {
      matchedCurated.add(match.id);
      return enrich(r, match);
    }
    return r;
  });

  // Curated venues OSM didn't return — add them so accolades never vanish.
  for (const c of curatedInArea) {
    if (!matchedCurated.has(c.id)) {
      merged.push({ ...c, source: "curated" });
    }
  }

  return merged.sort(rank);
}
