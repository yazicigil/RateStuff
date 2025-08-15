/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ]
  },
  i18n: {
    locales: ['tr', 'en'],
    defaultLocale: 'tr'
  }
};

export default nextConfig;