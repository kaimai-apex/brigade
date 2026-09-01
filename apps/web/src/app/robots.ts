import type { MetadataRoute } from "next";
import { FLAGSHIP_ARTICLE_PATH, ROADMAP_PATH } from "@/lib/learn";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/accelerator",
          "/apply",
          "/waitlist",
          "/login",
          "/signup",
          FLAGSHIP_ARTICLE_PATH,
          ROADMAP_PATH,
        ],
        disallow: [
          "/demo",
          "/api/",
          "/admin",
          "/directory",
          "/profile/",
          "/settings",
          "/onboarding",
          "/sessions",
          "/mentorship",
          "/mentors",
          "/learn",
          "/journal",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co"}/sitemap.xml`,
  };
}
