import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable experimental features for better performance
  experimental: {
    // Optimize packages for smaller bundle size
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@stackframe/stack",
      "remotion",
      "@remotion/player",
    ],
  },

  // Turbopack configuration
  turbopack: {
    // Resolve aliases for Remotion
    resolveAlias: {
      remotion: "remotion",
    },
  },
  
  // Compress responses
  compress: true,
  
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Headers for caching static assets
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
