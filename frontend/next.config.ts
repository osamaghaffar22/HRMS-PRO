import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ["172.18.80.1", "localhost:3000", "127.0.0.1:3000"],
    },
  },
  // Add this line to fix the HMR error
  // @ts-ignore - allowedDevOrigins is a valid dev-only option in Next.js 15
  allowedDevOrigins: ["172.18.80.1"],
};

export default nextConfig;
