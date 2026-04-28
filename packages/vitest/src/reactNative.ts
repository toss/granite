import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Plugin } from 'vitest/config';
import * as vite from 'vitest/node';
import { REACT_NATIVE_ASSET_EXTENSIONS, REACT_NATIVE_ASSET_MODULE_ID_PATTERN } from './assets';
import {
  DEFAULT_PLATFORM,
  buildReactNativeMirror,
  buildReactNativeTransformCache,
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  GRANITE_VITEST_RN_MANIFEST_FILENAME,
  GRANITE_VITEST_RN_OBJECTS_DIRECTORY,
  GRANITE_VITEST_RN_PACKAGES_DIRECTORY,
  REACT_NATIVE_PLATFORMS,
  resolveReactNativeModuleFromManifest,
  resolvePackageRoot,
  resolveReactNativePackageRoots,
  synthesizeDefaultPlatformFiles,
  type ReactNativeTransformCache,
} from './mirror';
import {
  REACT_NATIVE_TRANSFORM_ALLOWLIST,
  REACT_NATIVE_TRANSFORM_EXTENSIONS,
  shouldInlineReactNativeDependency,
  shouldTransformReactNativeFile,
} from './transpile';

const PLATFORM_RESOLUTION_ORDER = [
  DEFAULT_PLATFORM,
  'native',
  ...REACT_NATIVE_PLATFORMS.filter((platform) => platform !== DEFAULT_PLATFORM && platform !== 'native'),
] as const;
const PLATFORM_EXTENSION_SUFFIXES = ['tsx', 'ts', 'jsx', 'js'] as const;

export const REACT_NATIVE_RESOLVE_EXTENSIONS = [
  ...PLATFORM_RESOLUTION_ORDER.flatMap((platform) =>
    PLATFORM_EXTENSION_SUFFIXES.map((extension) => `.${platform}.${extension}`)
  ),
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.json',
] as const;
export const REACT_NATIVE_EXPORT_CONDITIONS = ['require', 'react-native'] as const;
export const JEST_LIKE_TEST_PATTERNS = [
  '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
  '**/__tests__/**/*.spec.{js,jsx,ts,tsx}',
  '**/?(*.)test.{js,jsx,ts,tsx}',
  '**/?(*.)spec.{js,jsx,ts,tsx}',
] as const;

const currentFilePath = fs.realpathSync(fileURLToPath(import.meta.url));
const currentDirectory = path.dirname(currentFilePath);

function getSetupFileExtension() {
  const extension = path.extname(currentFilePath);

  if (extension === '.ts' || extension === '.mts') {
    return '.ts';
  }

  return '.js';
}

export function resolveReactNativeSetupFiles() {
  const extension = getSetupFileExtension();

  return [
    path.join(currentDirectory, `reactNativeRuntime${extension}`),
    path.join(currentDirectory, `setup${extension}`),
  ];
}

export function reactNative(): Plugin {
  let reactNativeTransformCache: ReactNativeTransformCache | null = null;

  return {
    enforce: 'pre',
    name: 'granite-react-native',
    async config(conf) {
      const workspaceRoot = conf.root ?? conf.test?.root ?? process.cwd();
      const cacheDir = conf.cacheDir ?? '.vitest';
      const resolvedCacheDir = path.isAbsolute(cacheDir) ? cacheDir : path.join(workspaceRoot, cacheDir);

      reactNativeTransformCache = await buildReactNativeTransformCache(workspaceRoot, resolvedCacheDir);

      const resolve = {
        conditions: [...REACT_NATIVE_EXPORT_CONDITIONS],
        extensions: [...REACT_NATIVE_RESOLVE_EXTENSIONS],
      };

      const commonConfig = {
        define: {
          'globalThis.__GRANITE_VITEST_RN_CACHE_MANIFEST__': JSON.stringify(reactNativeTransformCache.manifestPath),
        },
        resolve,
        test: {
          environment: 'node',
          globals: true,
          include: [...JEST_LIKE_TEST_PATTERNS],
          setupFiles: resolveReactNativeSetupFiles(),
        },
      };

      if ('rolldownVersion' in vite) {
        return {
          oxc: {
            jsx: {
              importSource: 'react',
              runtime: 'automatic',
            },
          },
          ...commonConfig,
        };
      }

      return {
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: 'react',
        } as any,
        ...commonConfig,
      };
    },
    resolveId(id: string, importer?: string) {
      if (reactNativeTransformCache == null) {
        return undefined;
      }

      const resolved = resolveReactNativeModuleFromManifest(id, importer, reactNativeTransformCache.manifest);

      return resolved?.objectPath;
    },
    load(id: string) {
      const isReactNativeAsset = REACT_NATIVE_ASSET_MODULE_ID_PATTERN.test(id);

      if (!isReactNativeAsset) {
        return undefined;
      }

      // Match React Native's Jest asset transformer by exporting `{ testUri }`.
      const asset = {
        testUri: path.relative(currentDirectory, id.replace(/[?#].*$/, '')).replace(/\\/g, '/'),
      };

      return [
        `const asset = ${JSON.stringify(asset)};`,
        'export const testUri = asset.testUri;',
        'export default asset;',
      ].join('\n');
    },
  };
}

export {
  DEFAULT_PLATFORM,
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  GRANITE_VITEST_RN_MANIFEST_FILENAME,
  GRANITE_VITEST_RN_OBJECTS_DIRECTORY,
  GRANITE_VITEST_RN_PACKAGES_DIRECTORY,
  REACT_NATIVE_PLATFORMS,
  REACT_NATIVE_ASSET_EXTENSIONS,
  REACT_NATIVE_TRANSFORM_ALLOWLIST,
  REACT_NATIVE_TRANSFORM_EXTENSIONS,
  buildReactNativeMirror,
  buildReactNativeTransformCache,
  resolvePackageRoot,
  resolveReactNativeModuleFromManifest,
  resolveReactNativePackageRoots,
  synthesizeDefaultPlatformFiles,
  shouldInlineReactNativeDependency,
  shouldTransformReactNativeFile,
};
