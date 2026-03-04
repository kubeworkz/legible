const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  staticPageGenerationTimeout: 1000,
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: {
      displayName: true,
      ssr: true,
    },
  },
  transpilePackages: ['antd', '@ant-design/icons', '@ant-design/cssinjs'],
  // routes redirect
  async redirects() {
    return [
      {
        source: '/projects/:projectId/setup',
        destination: '/projects/:projectId/setup/connection',
        permanent: true,
      },
      // Redirect bare /projects to root (which resolves the correct project)
      {
        source: '/projects',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
