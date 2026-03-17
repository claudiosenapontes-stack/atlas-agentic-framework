/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  env: {
    FORCE_DEPLOY_TIMESTAMP: '1773731500',
    DECOMPOSE_MARKER: '9223-CACHEBUST-1742191200'
  },
  async headers() {
    return [
      {
        source: '/api/missions/:id/decompose',
        headers: [
          { key: 'X-Build-Marker', value: '9223-CACHEBUST-1742191200' }
        ]
      }
    ];
  }
}
module.exports = nextConfig
// Cache bust Tue Mar 17 03:11:40 EDT 2026 - ATLAS-PRIME-HARD-FORCE-9229
