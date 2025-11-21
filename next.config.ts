import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Configure server external packages for Prisma
  // These packages contain native bindings and must not be bundled
  serverExternalPackages: [
    '@prisma/client',
  ],
  // Allow local network access for development
  allowedDevOrigins: ['192.168.1.112'],
  // Set explicit root directory for Turbopack to find next/package.json
  turbopack: {
    root: '/workspace',
  },
  webpack(config, { isServer }) {
    // disabling fs and path to avoid the tears
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    return config;
  }
}

export default nextConfig