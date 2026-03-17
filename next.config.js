/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  env: {
    FORCE_DEPLOY_TIMESTAMP: '1773766000',
    DECOMPOSE_MARKER: '9223-CACHEBUST-1742191200',
    MISSION_COUNT_FIX: '9703-DEPLOYED',
    BUILD_ID: '9703-' + Date.now()
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
// Cache bust Tue Mar 17 12:46:00 EDT 2026 - ATLAS-PRIME-COUNT-FIX-DEPLOY-9703
