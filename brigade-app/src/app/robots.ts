import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep the chef's private back-office and admin out of the index.
      disallow: ["/dashboard", "/admin"],
    },
    sitemap: "https://brigade.example/sitemap.xml",
  };
}
