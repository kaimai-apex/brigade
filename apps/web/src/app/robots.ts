import type { MetadataRoute } from "next";

/**
 * Only the landing page and the waitlist are indexable.
 *
 * The middleware already redirects everything else for anyone without a
 * session, so a crawler cannot reach the app — but profile and post pages were
 * publicly reachable until now, and anything Google saw in that window should
 * be told to drop it. `/demo` is disallowed explicitly: it is unlisted, and an
 * unlisted page that turns up in a search result is no longer unlisted.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/waitlist"],
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
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://joinbrigade.co"}/sitemap.xml`,
  };
}
