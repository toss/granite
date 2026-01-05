/**
 * @type {import('@react-native-community/cli-types').Config}
 */
module.exports = {
  dependency: {
    platforms: {
      ios: {
        componentDescriptors: ['GraniteNaverMapViewComponentDescriptor'],
        cmakeListsPath: undefined,
      },
      android: {
        componentDescriptors: ['GraniteNaverMapViewComponentDescriptor'],
        cmakeListsPath: undefined,
      },
    },
  },
};
