module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import run.granite.navermap.GraniteNaverMapPackage;',
        packageInstance: 'new GraniteNaverMapPackage()',
      },
      ios: {
        sourceDir: './ios',
      },
    },
  },
};
