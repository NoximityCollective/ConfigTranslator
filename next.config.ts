import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages specific configuration
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
