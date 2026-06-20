import fs from 'node:fs/promises';
import path from 'node:path';
import execa from 'execa';

const TARGET_PACKAGE_NAME = '@granite-js/mpack';

const rootDir = path.resolve(__dirname, '..', '..');

const createPackageJsonSnapshots = async () => {
  const { stdout } = await execa('git', ['ls-files', 'packages/*/package.json'], { cwd: rootDir });
  const packageJsonPaths = stdout.split('\n').filter(Boolean);

  return Promise.all(
    packageJsonPaths.map(async (filePath) => ({
      filePath,
      content: await fs.readFile(path.join(rootDir, filePath), 'utf8'),
    }))
  );
};

const restorePackageJsonSnapshots = async (snapshots: Awaited<ReturnType<typeof createPackageJsonSnapshots>>) => {
  await Promise.all(snapshots.map(({ filePath, content }) => fs.writeFile(path.join(rootDir, filePath), content)));
};

export default async () => {
  console.log('\n\n👉 Packing...');

  const packageJsonSnapshots = await createPackageJsonSnapshots();
  try {
    await execa('yarn', ['tsx', '.scripts/linked-pack.ts', TARGET_PACKAGE_NAME], { cwd: rootDir });
  } finally {
    await restorePackageJsonSnapshots(packageJsonSnapshots);
  }

  console.log('✅ Global setup completed successfully');
};
