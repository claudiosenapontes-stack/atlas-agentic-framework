/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheBust: 9819,
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
