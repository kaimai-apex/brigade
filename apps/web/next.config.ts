import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
// pnpm hoists Next to the repo root — tracing must include it or Vercel λ routes 500.
const monorepoRoot = path.join(appDir, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  webpack: (config, { dev }) => {
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
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/legacy-landing.html" }],
    };
  },
};

export default nextConfig;
