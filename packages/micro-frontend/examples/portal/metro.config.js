const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const libraryRoot = path.resolve(__dirname, "../..");
const graniteReactNativeStub = path.resolve(
  __dirname,
  "graniteReactNativeStub.js",
);

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * The library is linked from `../..` and is not a workspace this example belongs
 * to, so Metro watches it and resolves its imports from this example's
 * node_modules. `@granite-js/react-native` is not installed here; see
 * `graniteReactNativeStub.js`.
 *
 * @type {import('metro-config').MetroConfig}
 */
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [libraryRoot],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, "node_modules")],
    resolveRequest: (context, moduleName, platform) =>
      moduleName === "@granite-js/react-native"
        ? { type: "sourceFile", filePath: graniteReactNativeStub }
        : context.resolveRequest(context, moduleName, platform),
  },
});
