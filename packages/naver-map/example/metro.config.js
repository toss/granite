const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    extraNodeModules: {
      '@granite-js/naver-map': root,
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
