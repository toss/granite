import path from 'node:path';
import { $ } from 'execa';

const TARGET_PACKAGE_NAMES = [
  'create-granite-app',
  '@granite-js/react-native',
  '@granite-js/native',
  '@granite-js/plugin-router',
  '@granite-js/plugin-hermes',
  '@granite-js/plugin-micro-frontend',
  'babel-preset-granite',
];

const rootDir = path.resolve(import.meta.dirname, '..', '..');

export default async () => {
  console.log('\n\n👉 Packing...');

  try {
    for (const packageName of TARGET_PACKAGE_NAMES) {
      await $`../../bin/tools linked-pack ${packageName}`;
    }

    console.log('✅ Global setup completed successfully');
  } finally {
    await $({ cwd: rootDir, shell: true })`git checkout -- packages/*/package.json`;
  }
};
