import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Activer la PWA
  experimental: {
    // Permet d'utiliser les Server Actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Configuration pour la PWA (sera complétée plus tard)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
