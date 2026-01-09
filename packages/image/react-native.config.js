module.exports = {
  dependency: {
    platforms: {
      android: {
        componentDescriptors: ['GraniteImageComponentDescriptor'],
        cmakeListsPath: '../build/generated/source/codegen/jni/CMakeLists.txt',
      },
    },
  },
};
