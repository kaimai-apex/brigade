import type { ExploreLocation, Restaurant } from "./types";
import { getDefaultLocation, getLocation } from "./locations";
import { fetchRestaurantsInBbox, OSM_ATTRIBUTION } from "./sources/overpass";
import { geocodePlace } from "./sources/geocode";
import { mergeCurated } from "./sources/merge";

/**
 * Server-only composition layer for the Explore restaurant loader. Pages call
 * `resolveLocation` on their search params, then `loadRestaurants` to pull live
 * OSM data (monthly-cached) merged with curated accolades. Intended for use
 * only from Server Components / server code — kept out of the client-facing
 * barrel (index.ts) so it never lands in a client bundle.
 */

/** Turn `?loc=` / `?q=` search params into a concrete location to browse. */
export async function resolveLocation(params: {
  loc?: string;
  q?: string;
}): Promise<ExploreLocation> {
  if (params.q) {
    const geo = await geocodePlace(params.q);
    if (geo) return geo;
  }
  return getLocation(params.loc) ?? getDefaultLocation();
}

export type LoadedRestaurants = {
  location: ExploreLocation;
  restaurants: Restaurant[];
  attribution: string;
  ok: boolean;
};

export async function loadRestaurants(
  location: ExploreLocation,
): Promise<LoadedRestaurants> {
  const { restaurants, ok } = await fetchRestaurantsInBbox(location.bbox);
  const merged = mergeCurated(restaurants, location.bbox);
  return {
    location,
    restaurants: merged,
    attribution: OSM_ATTRIBUTION,
    ok,
  };
}

export { OSM_ATTRIBUTION };
