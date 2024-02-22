/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dweb.link' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' }
    ],
  },
}

module.exports = nextConfig;
