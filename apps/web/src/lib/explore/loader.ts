import type { ExploreLocation, Restaurant } from "./types";
import { getDefaultLocation, getLocation } from "./locations";
import { geocodePlace } from "./sources/geocode";
import {
  fetchAssociations,
  fetchJobListings,
  fetchMapPins,
  fetchNeighbourhoods,
  fetchNews,
  fetchRestaurants,
  fetchSchools,
  fetchSuppliers,
  type RestaurantPage,
} from "./api";
import { getAssociations } from "./associations";
import { getJobs } from "./jobs";
import { getNeighbourhoods } from "./neighbourhoods";
import { getNews } from "./news";
import { getSchools } from "./schools";
import { getSuppliers } from "./suppliers";

/**
 * Server-side composition for Explore loaders. Location comes from `?loc=`
 * (preset) or `?q=` (geocoded); directory data comes from explore-service.
 * Kept out of the client-facing barrel (index.ts) so it never lands in a
 * client bundle. Static getters remain as offline fallbacks.
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

export async function loadSchools() {
  const page = await fetchSchools({ limit: 100 });
  return page.ok ? page.data : getSchools();
}

export async function loadAssociations() {
  const page = await fetchAssociations({ limit: 100 });
  return page.ok ? page.data : getAssociations();
}

export async function loadSuppliers() {
  const page = await fetchSuppliers({ limit: 100 });
  return page.ok ? page.data : getSuppliers();
}

export async function loadNews() {
  const page = await fetchNews({ limit: 100 });
  return page.ok ? page.data : getNews();
}

export async function loadJobListings() {
  const page = await fetchJobListings({ limit: 100 });
  return page.ok ? page.data : getJobs();
}

export async function loadNeighbourhoods(bbox?: ExploreLocation["bbox"]) {
  const page = await fetchNeighbourhoods({ bbox, limit: 100 });
  return page.ok ? page.data : getNeighbourhoods();
}

export async function loadDirectoryMapPins(bbox: ExploreLocation["bbox"]) {
  return fetchMapPins(bbox);
}

export type { Restaurant };
