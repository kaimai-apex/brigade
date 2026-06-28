import type { MetadataRoute } from "next";
import { getLiveChefs } from "@/lib/store";
import {
  indexableCities,
  indexableCityCuisine,
  slugify,
} from "@/lib/seo";

const BASE = "https://brigade.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const chefs = await getLiveChefs();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/chefs`, priority: 0.9 },
    { url: `${BASE}/signup`, priority: 0.6 },
  ];

  const profilePages: MetadataRoute.Sitemap = chefs.map((c) => ({
    url: `${BASE}/c/${c.slug}`,
    priority: 0.8,
  }));

  const cityPages: MetadataRoute.Sitemap = indexableCities(chefs).map((city) => ({
    url: `${BASE}/private-chef/${slugify(city)}`,
    priority: 0.7,
  }));

  const cuisinePages: MetadataRoute.Sitemap = indexableCityCuisine(chefs).map(
    ({ city, cuisine }) => ({
      url: `${BASE}/private-chef/${slugify(city)}/${slugify(cuisine)}`,
      priority: 0.6,
    }),
  );

  return [...staticPages, ...profilePages, ...cityPages, ...cuisinePages];
}
