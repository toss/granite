/**
 * @type {import('@jest/types').Config.InitialOptions}
 */
module.exports = {
  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
    '^.+\\.js$': 'babel-jest',
    '^.+\\.mjs$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 3 * 60_000,
  maxConcurrency: 1,
  maxWorkers: 1,
  passWithNoTests: true,
  detectOpenHandles: true,
  forceExit: true,
};
