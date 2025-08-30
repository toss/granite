const sharedConfig = require('../jest.config.js');

/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  ...sharedConfig,
  rootDir: __dirname,
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup-matchers.js'],
  transformIgnorePatterns: [],
  globals: {
    __DEV__: true,
  },
  preset: '@testing-library/react-native',
};
