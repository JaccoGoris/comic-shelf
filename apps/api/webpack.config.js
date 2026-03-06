const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = (config, { options } = {}) => ({
  watch: options?.watch,
  watchOptions: {
    ignored: [
      '**/node_modules/**',
      '**/dist/**',
      '**/libs/db/generated/**',
    ],
  },
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    alias: {
      '@comic-shelf/db': join(__dirname, '../../libs/db/src/index.ts'),
      '@comic-shelf/shared-types': join(__dirname, '../../libs/shared-types/src/index.ts'),
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMaps: true,
    }),
  ],
});
