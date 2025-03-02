/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['undici', 'firebase'],
  webpack: (config, { isServer }) => {
    // Fix for the undici private class fields issue
    config.module.rules.push({
      test: /node_modules\/undici\/.*\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-transform-private-methods', '@babel/plugin-transform-class-properties']
        }
      }
    });
    
    return config;
  },
};

module.exports = nextConfig; 