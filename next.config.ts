import type { NextConfig } from 'next';

function r2ImageRemotePatterns() {
  const domain = process.env.R2_DOMAIN?.trim();
  if (!domain) return [];
  try {
    const url = new URL(domain);
    const protocol = url.protocol.replace(':', '');
    if (protocol !== 'http' && protocol !== 'https') return [];
    return [{ protocol: protocol as 'http' | 'https', hostname: url.hostname }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_R2_DOMAIN: process.env.R2_DOMAIN ?? '',
  },
  async redirects() {
    return [{ source: '/', destination: '/admin', permanent: false }];
  },
  async rewrites() {
    return [{ source: '/api/openapi.json', destination: '/api/openapi' }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'diiospp53gsun.cloudfront.net' },
      { protocol: 'https', hostname: 'www.vexmotor.com' },
      ...r2ImageRemotePatterns(),
    ],
  },
  serverExternalPackages: ['@aws-sdk/client-s3', 'proxy-agent'],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'proxy-agent': false,
        '@aws-sdk/client-s3': false,
        http: false,
        https: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
