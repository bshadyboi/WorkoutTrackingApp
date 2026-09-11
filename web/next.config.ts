import type { NextConfig } from "next";

/**
 * Intentionally NO service worker.
 * next-pwa/Workbox made Add-to-Home-Screen laggy on iOS (intercepts every
 * navigation and waits on NetworkFirst). Manifest alone still allows home screen.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/version.json",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
