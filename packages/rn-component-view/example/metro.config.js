const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const packageRoot = path.resolve(__dirname, '..');
const microFrontendRoot = path.resolve(__dirname, '../../micro-frontend');
const graniteReactNativeStub = path.resolve(__dirname, 'graniteReactNativeStub.js');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * The packages are linked from `..` and `../../micro-frontend` and are not workspaces this example belongs to, so
 * Metro watches them and resolves their imports from this example's node_modules. `@granite-js/react-native` is not
 * installed here; see `graniteReactNativeStub.js`.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [packageRoot, microFrontendRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
    resolveRequest: (context, moduleName, platform) =>
      moduleName === '@granite-js/react-native'
        ? { type: 'sourceFile', filePath: graniteReactNativeStub }
        : context.resolveRequest(context, moduleName, platform),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
