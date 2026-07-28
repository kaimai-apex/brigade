import type { MetadataRoute } from "next";

/** The only two pages a stranger can reach, so the only two worth listing. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/waitlist`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
