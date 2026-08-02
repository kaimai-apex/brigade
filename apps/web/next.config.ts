import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
// pnpm hoists Next to the repo root — tracing must include it or Vercel λ routes 500.
const monorepoRoot = path.join(appDir, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  // pino pulls optional native deps (thread-stream) that webpack can't resolve
  // from the pnpm store layout — keep them as Node requires at runtime.
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "thread-stream",
    "atomic-sleep",
    "on-exit-leak-free",
  ],
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
      { source: "/connections", destination: "/network", permanent: true },
      { source: "/jobs", destination: "/opportunities", permanent: false },
      // Edge redirect (not a page-level redirect) so Safari back from /waitlist
      // doesn't bounce through /signup → /waitlist again.
      { source: "/signup", destination: "/waitlist", permanent: false },
      { source: "/signup/:path*", destination: "/waitlist", permanent: false },
    ];
  },
  webpack: (config, { dev }) => {
    // pnpm nests pino deps; Next's webpack resolve starts from apps/web and
    // misses thread-stream unless we include pino's node_modules in the path.
    config.resolve.modules = [
      path.join(monorepoRoot, "node_modules/.pnpm/pino@9.14.0/node_modules"),
      path.join(monorepoRoot, "node_modules"),
      path.join(appDir, "node_modules"),
      ...(config.resolve.modules ?? ["node_modules"]),
    ];
    config.resolve.alias = {
      ...config.resolve.alias,
      "thread-stream": path.join(
        monorepoRoot,
        "node_modules/.pnpm/thread-stream@3.2.0/node_modules/thread-stream",
      ),
    };
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          path.join(appDir, "../../services/**"),
          path.join(appDir, "../../packages/**"),
        ],
      };
    }
    return config;
  },
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
