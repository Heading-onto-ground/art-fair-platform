/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@vercel/blob", "undici"],
  },
  async headers() {
    return [
      {
        // All routes except /embed (embeds must be iframe-able from other sites)
        source: '/((?!embed/).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
      {
        source: '/embed/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        // Canonical host: non-www. Prevents split indexing between
        // www.rob-roleofbridge.com and rob-roleofbridge.com.
        source: '/:path*',
        has: [{ type: 'host', value: 'www.rob-roleofbridge.com' }],
        destination: 'https://rob-roleofbridge.com/:path*',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
