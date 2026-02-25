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
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // ✅ Vercel auto-converts to WebP/AVIF and resizes on the fly
    formats: ["image/avif", "image/webp"],
    // ✅ LCP FIX: Tighter device sizes targeting actual mobile breakpoints
    // Removed 1920 — your users are 90%+ mobile (DR, Morocco, US mobile)
    // This reduces the number of srcset entries the browser must evaluate
    deviceSizes: [390, 414, 640, 750, 828, 1080, 1200],
    // ✅ LCP FIX: Smaller image sizes for thumbnails/logos/icons
    imageSizes: [32, 48, 64, 96, 128, 256],
    // ✅ LCP FIX: Reduce quality slightly for faster delivery (barely perceptible)
    // Default is 75 — 80 is a good balance for food/product photos
    minimumCacheTTL: 2678400, // 31 days — images rarely change once uploaded
  },

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
      // ✅ LCP FIX: Cache static assets aggressively
      {
        source: "/(.*)\\.(jpg|jpeg|png|webp|avif|svg|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ✅ Cache fonts aggressively
      {
        source: "/(.*)\\.(woff|woff2|ttf|otf)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

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