module.exports = {
  preset: "react-native",
  setupFiles: ["./jestSetup.js"],
  moduleNameMapper: {
    "^@granite-js/micro-frontend$": "<rootDir>/../../src/index.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|@react-navigation|react-native|@granite-js/micro-frontend)/)",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
