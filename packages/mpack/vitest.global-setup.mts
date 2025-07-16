import path from 'node:path';
import execa from 'execa';

const TARGET_PACKAGE_NAME = '@granite-js/mpack';

const toolsPath = path.resolve(__dirname, '..', '..', 'bin', 'tools');

export default async () => {
  console.log('\n\n👉 Packing...');

  await execa('pwd');
  await execa(toolsPath, ['linked-pack', TARGET_PACKAGE_NAME]);
  await execa('git', ['reset', '--hard']);
  await execa('git', ['clean', '-fd']);

  console.log('✅ Global setup completed successfully');
};
