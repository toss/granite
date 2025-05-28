import { exec } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHARED_SERVICE_NAME = 'shared';

async function getPackageJson() {
  const rawPackageJson = await fs.promises.readFile(path.resolve(import.meta.dirname, '../package.json'), {
    encoding: 'utf-8',
  });

  return JSON.parse(rawPackageJson);
}

async function getSharedPackageJson() {
  const task = new Promise((resolve, reject) => {
    exec(`yarn workspace ${SHARED_SERVICE_NAME} exec cat package.json`, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(stdout.trim());
    });
  });

  const rawPackageJson = await task;

  return JSON.parse(rawPackageJson);
}

const { dependencies } = await getPackageJson();
const { dependencies: baseDependencies } = await getSharedPackageJson();
let mismatchCount = 0;

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
