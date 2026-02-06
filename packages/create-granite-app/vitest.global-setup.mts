import { $ } from 'execa';

const TARGET_PACKAGE_NAMES = [
  'create-granite-app',
  '@granite-js/react-native',
  '@granite-js/native',
  '@granite-js/plugin-router',
  '@granite-js/plugin-hermes',
  'babel-preset-granite',
];

export default async () => {
  console.log('\n\n👉 Packing...');

  for (const packageName of TARGET_PACKAGE_NAMES) {
    await $`../../bin/tools linked-pack ${packageName}`;
  }

  await $`git checkout -- packages/*/package.json`;

  console.log('✅ Global setup completed successfully');
};
