import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
// pnpm hoists Next to the repo root — tracing must include it or Vercel λ routes 500.
const monorepoRoot = path.join(appDir, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // /connections → /network and /jobs → /opportunities are gone: both
      // destinations were deleted with the social network, so the redirects
      // pointed at 404s. An old link should say "not here" once, not twice.
      // Edge redirect (not a page-level redirect) so Safari back from /waitlist
      // doesn't bounce through /signup → /waitlist again.
      { source: "/signup", destination: "/waitlist", permanent: false },
      { source: "/signup/:path*", destination: "/waitlist", permanent: false },
    ];
  },
  // The webpack block that lived here existed entirely to make pino's
  // thread-stream resolve through pnpm's store layout. @connectpro/common no
  // longer bundles a logger — it is pg, jsonwebtoken and node crypto now — so
  // there is nothing left to alias, and the dev watch ignores pointed at
  // services/ and packages/ that no longer exist.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
