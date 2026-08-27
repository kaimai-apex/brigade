import type { MetadataRoute } from "next";

/** Public entry points worth listing. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/accelerator`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/apply`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${base}/journal`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/roadmap`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/mentors`, changeFrequency: "daily", priority: 0.6 },
    { url: `${base}/waitlist`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/login`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/signup`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
