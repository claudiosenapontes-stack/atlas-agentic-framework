/** @type {import('next').NextConfig} */
// Deployment trigger: 9871-9872 Force redeploy - cacheBust bump
const nextConfig = {
  cacheBust: 9871,  // Bumped for watchlist pipeline deploy
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Cache-Bust', value: '9819' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
