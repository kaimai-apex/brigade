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
        allow: ["/", "/mentors", "/waitlist", "/login"],
        disallow: [
          "/demo",
          "/api/",
          "/directory",
          "/feed",
          "/brigade",
          "/profile/",
          "/posts/",
          "/hashtag/",
          "/company/",
          "/companies",
          "/jobs",
          "/messages",
          "/notifications",
          "/search",
          "/settings",
          "/onboarding",
          "/admin",
          "/sessions",
          "/mentorship",
          "/signup",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co"}/sitemap.xml`,
  };
}
