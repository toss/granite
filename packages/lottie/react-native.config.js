module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: 'android',
        packageImportPath: 'import com.anthropic.granitelottie.GraniteLottieViewPackage;',
        packageInstance: 'new GraniteLottieViewPackage()',
      },
      ios: {},
    },
  },
};
