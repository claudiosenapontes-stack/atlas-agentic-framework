/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  env: {
    FORCE_DEPLOY_TIMESTAMP: '1773764200',
    DECOMPOSE_MARKER: '9223-CACHEBUST-1742191200',
    MISSION_COUNT_FIX: '9502-TRUTH-FIX'
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
// Cache bust Tue Mar 17 12:20:00 EDT 2026 - ATLAS-PRIME-MISSION-COUNT-FIX-9502
