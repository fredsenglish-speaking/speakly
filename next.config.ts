import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Profile photos are shrunk in the browser, but allow room for the original if that fails.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
