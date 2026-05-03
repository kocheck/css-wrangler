import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  compiler: {
    styledComponents: true,
  },
  // web/ pulls types from ../src/shared/* (see tsconfig path alias).
  // Tells Next's file tracer the project boundary is the repo root.
  outputFileTracingRoot: "../",
};

export default nextConfig;
