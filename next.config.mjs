/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    // Modern formatları tercih et
    formats: ['image/avif', 'image/webp'],
    // Next/Image cache TTL (saniye)
    minimumCacheTTL: 31536000, // 1 yıl
  },
  // _next/image için agresif cache header (CDN tarafında da override edilebilir)
  async headers() {
    return [
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};
export default nextConfig;
