/**
 * @type {import('@react-native-community/cli-types').Config}
 */
module.exports = {
  dependency: {
    platforms: {
      ios: {
        componentDescriptors: ['GraniteVideoViewComponentDescriptor'],
        cmakeListsPath: undefined,
      },
      android: {
        componentDescriptors: ['GraniteVideoViewComponentDescriptor'],
        cmakeListsPath: undefined,
      },
    },
  },
};
