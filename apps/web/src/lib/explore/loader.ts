import type { ExploreLocation, Restaurant } from "./types";
import { getDefaultLocation, getLocation } from "./locations";
import { geocodePlace } from "./sources/geocode";
import { fetchRestaurants, type RestaurantPage } from "./api";

/**
 * Server-side composition for the Explore restaurant loader. Location comes
 * from `?loc=` (preset) or `?q=` (geocoded); restaurants + filtering come from
 * explore-service (Postgres-backed, OSM read-through). Kept out of the
 * client-facing barrel (index.ts) so it never lands in a client bundle.
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

export type RestaurantFilters = {
  cuisine?: string;
  price?: string;
  accolade?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type LoadedRestaurants = RestaurantPage & {
  location: ExploreLocation;
};

export async function loadRestaurants(
  location: ExploreLocation,
  filters: RestaurantFilters = {},
): Promise<LoadedRestaurants> {
  const page = await fetchRestaurants({
    bbox: location.bbox,
    cuisine: filters.cuisine,
    price: filters.price,
    accolade: filters.accolade,
    q: filters.search,
    page: filters.page,
    limit: filters.limit ?? 60,
  });
  return { ...page, location };
}

export type { Restaurant };
