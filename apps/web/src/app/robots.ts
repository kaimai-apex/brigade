import type { MetadataRoute } from "next";

/**
 * Mentorship marketplace is the public front door; waitlist and login are also
 * crawlable entry points. Everything else stays behind auth.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/mentors", "/waitlist", "/login", "/signup"],
        disallow: [
          "/demo",
          "/api/",
          "/directory",
          "/profile/",
          "/settings",
          "/onboarding",
          "/sessions",
          "/mentorship",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co"}/sitemap.xml`,
  };
}
