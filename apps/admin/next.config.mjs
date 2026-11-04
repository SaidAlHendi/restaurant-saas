/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // @app/ui and @app/shared are workspace packages built to dist by their own build step.
  transpilePackages: ['@app/ui'],
};

export default nextConfig;
