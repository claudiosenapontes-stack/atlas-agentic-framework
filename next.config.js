/** @type {import('next').NextConfig} */
// Deployment trigger: 9869-A Force redeploy for DELETE/PATCH routes
const nextConfig = {
  cacheBust: 9870,  // Bumped for 9869-A redeploy
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
