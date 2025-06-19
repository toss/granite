import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHARED_SERVICE_NAME = '@granite-app/shared';

async function getPackageJson() {
  const rawPackageJson = await fs.promises.readFile(path.resolve(import.meta.dirname, '../package.json'), {
    encoding: 'utf-8',
  });

  return JSON.parse(rawPackageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    exports?: Record<string, any>;
  };
}

async function getSharedPackageJson() {
  const task = new Promise<string>((resolve, reject) => {
    exec(`yarn workspace ${SHARED_SERVICE_NAME} exec cat package.json`, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout.trim());
    });
  });

  const rawPackageJson = await task;

  return JSON.parse(rawPackageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

const { dependencies = {}, exports = {} } = await getPackageJson();
const { dependencies: baseDependencies = {} } = await getSharedPackageJson();
const nativePackages = JSON.parse(
  await fs.promises.readFile(path.resolve(import.meta.dirname, '../native-packages.json'), 'utf-8')
) as string[];
const nativeDependencies = Object.keys(dependencies);

let mismatchCount = 0;

console.log('Checking native packages...');
if (!nativePackages.every((nativePackageName) => nativeDependencies.includes(nativePackageName))) {
  console.error('❗️ Some native packages are not in the native package');
  process.exit(1);
} else {
  console.log('✅ All native packages are in the native package');
}

console.log('Checking exports map...');
let hasExportsMapError = false;
Object.entries(exports).forEach(([subpath, config]) => {
  const targetDependency = nativeDependencies.find((dependencyName) => dependencyName === subpath.replace(/^\.\//, ''));

  if (targetDependency == null) {
    console.error(`❗️ ${subpath} is not in the exports map`);
    hasExportsMapError ||= true;
  }

  if (config.default !== `./src/${targetDependency}/index.d.ts`) {
    console.error(`❗️ ${targetDependency} is not in the exports map (field: default)`);
    hasExportsMapError ||= true;
  }

  if (config.types !== `./dist/${targetDependency}/index.d.ts`) {
    console.error(`❗️ ${targetDependency} is not in the exports map (field: types)`);
    hasExportsMapError ||= true;
  }
});

if (hasExportsMapError) {
  process.exit(1);
}

console.log('Checking shared packages...');
Object.entries(baseDependencies).forEach(([name, baseVersion]) => {
  if (!(name in dependencies)) {
    return;
  }

  const version = dependencies[name];
  if (version !== baseVersion) {
    console.error(`❗️ Version mismatch: ${name}@${version} (expect: ${baseVersion})`);
    mismatchCount++;
  } else {
    console.log(`✅ ${name}@${version}`);
  }
});

process.exit(mismatchCount === 0 ? 0 : 1);
