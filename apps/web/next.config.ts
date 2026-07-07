import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Scope dev file watching to this app — not the whole monorepo (avoids EMFILE).
  outputFileTracingRoot: appDir,
  turbopack: {
    root: appDir,
  },
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
