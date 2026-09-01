import type { MetadataRoute } from "next";
import { FLAGSHIP_ARTICLE_PATH, ROADMAP_PATH } from "@/lib/learn";

/** Public entry points worth listing. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/accelerator`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/apply`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/waitlist`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}${FLAGSHIP_ARTICLE_PATH}`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}${ROADMAP_PATH}`, changeFrequency: "weekly", priority: 0.85 },
  ];
}
