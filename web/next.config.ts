import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  compiler: {
    styledComponents: true,
  },
  // web/ pulls types from ../src/shared/* (see tsconfig path alias).
  // Resolved against this config's location, not CWD, so it's stable
  // regardless of where `next build` is invoked from.
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
