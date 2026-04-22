import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REACT_NATIVE_ASSET_EXTENSIONS = [
  'bmp',
  'gif',
  'jpg',
  'jpeg',
  'mp4',
  'png',
  'psd',
  'svg',
  'webp',
] as const;

const currentFilePath = fs.realpathSync(fileURLToPath(import.meta.url));
const currentDirectory = path.dirname(currentFilePath);
const reactNativeAssetPattern = new RegExp(
  `\\.(${REACT_NATIVE_ASSET_EXTENSIONS.join('|')})(?:[?#].*)?$`,
  'i',
);

function normalizePath(pathname: string) {
  return pathname.replace(/\\/g, '/');
}

export function stripReactNativeAssetQuery(moduleId: string) {
  return moduleId.replace(/[?#].*$/, '');
}

export function isReactNativeAssetModuleId(moduleId: string) {
  return reactNativeAssetPattern.test(moduleId);
}

export function createReactNativeAssetModuleValue(moduleId: string) {
  return {
    testUri: normalizePath(path.relative(currentDirectory, stripReactNativeAssetQuery(moduleId))),
  };
}

export function createReactNativeAssetModuleCode(moduleId: string) {
  const asset = createReactNativeAssetModuleValue(moduleId);

  return [
    `const asset = ${JSON.stringify(asset)};`,
    'export const testUri = asset.testUri;',
    'export default asset;',
  ].join('\n');
}
