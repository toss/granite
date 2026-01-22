module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: 'android',
        packageImportPath: 'import run.granite.lottie.GraniteLottieViewPackage;',
        packageInstance: 'new GraniteLottieViewPackage()',
      },
      ios: {},
    },
  },
};
