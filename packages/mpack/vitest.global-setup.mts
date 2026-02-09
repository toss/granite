import path from 'node:path';
import execa from 'execa';

const TARGET_PACKAGE_NAME = '@granite-js/mpack';

const rootDir = path.resolve(__dirname, '..', '..');
const toolsPath = path.resolve(rootDir, 'bin', 'tools');

export default async () => {
  console.log('\n\n👉 Packing...');

  await execa(toolsPath, ['linked-pack', TARGET_PACKAGE_NAME]);
  await execa('git', ['checkout', '--', 'packages/*/package.json'], {
    shell: true,
    cwd: rootDir,
  });

  console.log('✅ Global setup completed successfully');
};
