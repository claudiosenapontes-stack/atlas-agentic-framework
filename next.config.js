/** @type {import('next').NextConfig} */
// Deployment trigger: 9884-MSN-CacheBust
const nextConfig = {
  cacheBust: 9884,  // Bumped for ATLAS-MSN-9884 calendar sync fix
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Cache-Bust', value: '9884' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
