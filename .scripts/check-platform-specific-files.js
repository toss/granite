 

/**
 * @description
 * 지정한 패키지 내에 플랫폼 식별 파일이 존재하는지 확인하는 스크립트입니다.
 *
 * ```bash
 * node .scripts/check-platform-specific-files.js packages/core
 * ```
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const EXCLUDED_FOLDERS = ['__tests__', '__fixtures__'];
const PLATFORM_SPECIFIED_PREFIX = ['native', 'android', 'ios'];
const EXCLUDED_FILES = ['e2e.ts', 'test.ts'];

const packageRoot = process.argv[2];
assert(packageRoot?.startsWith('packages/'), 'packages/* 형식의 패키지 경로를 입력해주세요');
const packageSource = path.join(packageRoot, 'src');
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf-8'));

const platformSpecifiedFiles = [];

function isPlatformSpecified(filePath) {
  const extension = path.extname(filePath);

  return PLATFORM_SPECIFIED_PREFIX.some((prefix) => filePath.endsWith(`.${prefix}${extension}`));
}

function exploreDirectory(dir) {
  const filesAndFolders = fs.readdirSync(dir);

  filesAndFolders.forEach((fileOrFolder) => {
    const fullPath = path.join(dir, fileOrFolder);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_FOLDERS.includes(fileOrFolder)) {
        exploreDirectory(fullPath);
      }
    } else if (stat.isFile() && isPlatformSpecified(fileOrFolder)) {
      if (!EXCLUDED_FILES.includes(fileOrFolder)) {
        platformSpecifiedFiles.push(fullPath);
      }
    }
  });
}

function hasESM(exportsMap) {
  return JSON.stringify(exportsMap).includes('.mjs');
}

exploreDirectory(packageSource);

console.log('플랫폼 식별 파일 리스트');
console.log(platformSpecifiedFiles, '\n');

if (platformSpecifiedFiles.length && hasESM(packageJson.exports)) {
  console.log('❗️ 본 패키지는 exports map 구성에서 ESM 파일을 지정하면 안됩니다');
  console.log(packageJson.exports);
  process.exit(1);
}
