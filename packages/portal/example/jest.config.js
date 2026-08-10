module.exports = {
  preset: "react-native",
  setupFiles: ["./jestSetup.js"],
  moduleNameMapper: {
    "^@granite-js/portal$": "<rootDir>/../src/index.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|@react-navigation|react-native|@granite-js/portal)/)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
