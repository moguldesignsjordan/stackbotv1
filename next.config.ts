import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    unoptimized: true,
  },
  // Fix COOP issues for Firebase popup auth (web fallback)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  // Proxy Firebase auth handler to your custom domain
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://stackbot-a5e78.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;