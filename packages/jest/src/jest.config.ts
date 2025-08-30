import fs from 'fs';
import path from 'path';
import type { Config } from 'jest';

const defaultSettings = {
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['react-native'],
  },
  preset: 'react-native',
  transformIgnorePatterns: [],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/esm/'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleDirectories: ['node_modules', 'src'],
  maxWorkers: 1,
};

function settings(extraSettings: Config): Config {
  const settings = {
    ...defaultSettings,
    ...extraSettings,
    setupFilesAfterEnv: handleSetupFilesAfterEnv(extraSettings),
    testMatch: handleTestMatch(extraSettings),
    displayName: handleDisplayName(extraSettings),
  };

  if (settings.rootDir == null) {
    console.error(
      [
        `jest.config.js에서 rootDir를 __dirname으로 설정해주세요.`,
        '',
        '예시 코드:',
        '// jest.config.js',
        `module.exports = require('@granite-js/jest').config({`,
        `  rootDir: __dirname,`,
        `});`,
      ].join('\n')
    );
  }

  return settings;
}

function handleDisplayName(extraSettings: Config | undefined): Config['displayName'] | undefined {
  if (extraSettings?.rootDir != null) {
    const packageJSONPath = path.resolve(extraSettings.rootDir, 'package.json');

    if (fs.existsSync(packageJSONPath)) {
      return require(packageJSONPath).name;
    }
  }

  return undefined;
}

function handleTestMatch(extraSettings: Config | undefined): Config['testMatch'] {
  if (extraSettings?.rootDir != null && extraSettings.testMatch == null) {
    return [
      path.join(extraSettings.rootDir, '**/*.{spec,test}.{js,jsx,ts,tsx}'),
      path.join(extraSettings.rootDir, '**/__tests__/**/*.{js,jsx,ts,tsx}'),
    ];
  }

  return defaultSettings.testMatch;
}

function handleSetupFilesAfterEnv(extraSettings: Config | undefined): Config['setupFilesAfterEnv'] {
  const rootDir = extraSettings?.rootDir;

  if (rootDir != null) {
    const setupFilesAfterEnv = extraSettings?.setupFilesAfterEnv ?? defaultSettings.setupFilesAfterEnv;

    return setupFilesAfterEnv
      .map((file) => path.resolve(rootDir, file.replace('<rootDir>/', '')))
      .filter((filepath) => fs.existsSync(filepath));
  }

  return defaultSettings.setupFilesAfterEnv;
}

export default Object.assign(settings, defaultSettings);
