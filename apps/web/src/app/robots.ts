import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/accelerator", "/apply", "/waitlist", "/login", "/signup"],
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
          "/roadmap",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co"}/sitemap.xml`,
  };
}
