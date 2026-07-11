import { getRestaurants } from "./restaurants";
import { getSchools } from "./schools";
import { getSuppliers } from "./suppliers";
import { getJobs } from "./jobs";
import { getNeighbourhoods } from "./neighbourhoods";
import type { MapPin } from "./types";

export * from "./types";
export * from "./restaurants";
export * from "./schools";
export * from "./associations";
export * from "./suppliers";
export * from "./news";
export * from "./jobs";
export * from "./neighbourhoods";

/**
 * Explore section registry — drives the hub grid and the section sub-nav.
 * Order matches the 7 sub-sections in the project MD §3.
 */
export const EXPLORE_SECTIONS = [
  {
    slug: "restaurants",
    href: "/explore/restaurants",
    emoji: "🍽️",
    title: "Featured Restaurants",
    tagline: "Curated Toronto rooms — Michelin, 100 Best & local picks",
  },
  {
    slug: "professionals",
    href: "/explore/professionals",
    emoji: "👨‍🍳",
    title: "Featured Professionals",
    tagline: "Founding chefs, sommeliers and pros with verified profiles",
  },
  {
    slug: "news",
    href: "/explore/news",
    emoji: "📰",
    title: "Industry News",
    tagline: "Daily hospitality headlines from across Toronto & Canada",
  },
  {
    slug: "map",
    href: "/explore/map",
    emoji: "📍",
    title: "Hospitality Map",
    tagline: "Restaurants, schools, suppliers and jobs across the GTA",
  },
  {
    slug: "resources",
    href: "/explore/resources",
    emoji: "🎓",
    title: "Resources & Schools",
    tagline: "Culinary programs, certifications and associations",
  },
  {
    slug: "suppliers",
    href: "/explore/suppliers",
    emoji: "🛒",
    title: "Suppliers",
    tagline: "Food, equipment and smallwares supplier directory",
  },
  {
    slug: "jobs",
    href: "/explore/jobs",
    emoji: "💼",
    title: "Jobs",
    tagline: "Fresh Toronto hospitality roles, refreshed weekly",
  },
] as const;

export type ExploreSectionSlug = (typeof EXPLORE_SECTIONS)[number]["slug"];

/** Aggregate every geo-located seed record into unified map pins (MD §4.8). */
export function getMapPins(): MapPin[] {
  const pins: MapPin[] = [];

  for (const r of getRestaurants()) {
    pins.push({
      id: r.id,
      layer: "restaurants",
      name: r.name,
      lat: r.lat,
      lng: r.lng,
      href: `/explore/restaurants/${r.slug}`,
      meta: r.neighbourhood,
    });
  }
  for (const s of getSchools()) {
    pins.push({
      id: s.id,
      layer: "schools",
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      href: "/explore/resources",
      meta: s.city,
    });
  }
  for (const sup of getSuppliers()) {
    if (sup.lat == null || sup.lng == null) continue;
    pins.push({
      id: sup.id,
      layer: "suppliers",
      name: sup.name,
      lat: sup.lat,
      lng: sup.lng,
      href: "/explore/suppliers",
      meta: sup.categories.join(" · "),
    });
  }
  // Jobs use their neighbourhood centroid so "hiring now" shows on the map.
  const nbhds = getNeighbourhoods();
  for (const j of getJobs()) {
    const n = nbhds.find(
      (nb) => nb.name.toLowerCase() === j.neighbourhood.toLowerCase(),
    );
    if (!n) continue;
    pins.push({
      id: j.id,
      layer: "jobs",
      name: `${j.title} — ${j.employer}`,
      lat: n.lat,
      lng: n.lng,
      href: "/explore/jobs",
      meta: j.neighbourhood,
    });
  }

  return pins;
}
