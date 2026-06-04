import path from 'node:path';
import { $ } from 'execa';

const TARGET_PACKAGE_NAMES = [
  'create-granite-app',
  '@granite-js/react-native',
  '@granite-js/native',
  '@granite-js/brownfield-module',
  '@granite-js/plugin-router',
  '@granite-js/plugin-hermes',
  'babel-preset-granite',
];

const rootDir = path.resolve(import.meta.dirname, '..', '..');

export default async () => {
  console.log('\n\n👉 Packing...');

  for (const packageName of TARGET_PACKAGE_NAMES) {
    await $`../../bin/tools linked-pack ${packageName}`;
  }

  await $({ cwd: rootDir, shell: true })`git checkout -- packages/*/package.json`;

  console.log('✅ Global setup completed successfully');
};
