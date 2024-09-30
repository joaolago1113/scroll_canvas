/** @type {import('next').NextConfig} */

const isGithubActions = process.env.GITHUB_ACTIONS || false;

let assetPrefix = '';
let basePath = '';

if (isGithubActions) {
  // Get the repository name from the GITHUB_REPOSITORY environment variable
  const repo = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.replace(/.*?\//, '') : '';

  assetPrefix = `/${repo}/`;
  basePath = `/${repo}`;
}

const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Enables static export
  images: {
    unoptimized: true,
  },
  assetPrefix: assetPrefix,
  basePath: basePath,
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === 'true',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === 'true',
  },
  webpack: config => {
    config.resolve.fallback = { fs: false, net: false, tls: false };

    // Ensure externals is defined before pushing
    if (config.externals) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    } else {
      config.externals = ['pino-pretty', 'lokijs', 'encoding'];
    }

    return config;
  },
};

module.exports = nextConfig;
