module.exports = {
  dependency: {
    platforms: {
      android: {
        componentDescriptors: [
          'PortalViewComponentDescriptor',
          'PortalHostViewComponentDescriptor',
        ],
        cmakeListsPath: '../android/CMakeLists.txt',
      },
    },
  },
};
