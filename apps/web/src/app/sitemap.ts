import type { MetadataRoute } from "next";

/** Public entry points worth listing. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co";
  return [
    { url: `${base}/mentors`, changeFrequency: "daily", priority: 1 },
    { url: base, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/waitlist`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
