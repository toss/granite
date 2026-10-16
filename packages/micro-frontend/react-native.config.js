module.exports = {
  dependency: {
    platforms: {
      android: {
        componentDescriptors: [
          'PortalViewComponentDescriptor',
          'PortalHostViewComponentDescriptor',
          'GranitePortalInitialContentViewComponentDescriptor',
        ],
        cmakeListsPath: '../android/src/main/jni/CMakeLists.txt',
      },
    },
  },
};
