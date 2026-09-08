/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Pour Next.js 16 avec Turbopack
  },
  serverExternalPackages: ['@prisma/client', 'bcrypt'],
  // Configuration des headers pour Vercel
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With, Accept',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      // Configuration spécifique pour les endpoints Better-Auth
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  // Redirections pour Better-Auth
  async redirects() {
    return [
      // Si vous avez besoin de redirections spécifiques
    ];
  },
};

module.exports = nextConfig;
