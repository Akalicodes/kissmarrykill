import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // Allow LAN access from phones / other devices during dev so HMR works
  // when hitting the dev server via 192.168.x.x:3000.
  allowedDevOrigins: ["192.168.1.73", "192.168.0.0/16", "10.0.0.0/8"],
};

export default nextConfig;
