import { CITIES, CUISINES } from "./seed";
import type { ChefProfile } from "./types";

export function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function cityFromSlug(slug: string): string | null {
  return CITIES.find((c) => slugify(c) === slug) ?? null;
}

export function cuisineFromSlug(slug: string): string | null {
  return CUISINES.find((c) => slugify(c) === slug) ?? null;
}

/**
 * Programmatic-SEO guard (docs/07): only emit a [city]/[cuisine] page once real
 * supply exists, because "thin/empty pages get penalized." Returns the city/
 * cuisine combinations that have at least one live chef.
 */
export function indexableCityCuisine(chefs: ChefProfile[]): {
  city: string;
  cuisine: string;
}[] {
  const out: { city: string; cuisine: string }[] = [];
  for (const city of CITIES) {
    for (const cuisine of CUISINES) {
      const has = chefs.some(
        (c) => c.city === city && c.cuisines.includes(cuisine),
      );
      if (has) out.push({ city, cuisine });
    }
  }
  return out;
}

export function indexableCities(chefs: ChefProfile[]): string[] {
  return CITIES.filter((city) => chefs.some((c) => c.city === city));
}
