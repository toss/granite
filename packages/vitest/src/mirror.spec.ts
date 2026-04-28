import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildReactNativeTransformCache,
  collectMirroredReactNativePackageNames,
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  GRANITE_VITEST_RN_MANIFEST_FILENAME,
  GRANITE_VITEST_RN_OBJECTS_DIRECTORY,
  resolveReactNativeModuleFromManifest,
} from './mirror';

function collectBasenames(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return [entry.name, ...collectBasenames(entryPath)];
    }

    return [entry.name];
  });
}

describe('mirror helpers', () => {
  it('selects the React Native package set that should be mirrored', () => {
    expect(
      collectMirroredReactNativePackageNames(
        {
          dependencies: {
            '@react-native-community/blur': '*',
            '@react-native/js-polyfills': '*',
            foo: '*',
            'jest-react-native': '*',
            'react-native': '*',
          },
        },
        {
          dependencies: {
            '@react-native/js-polyfills': '*',
            '@react-native/virtualized-lists': '*',
            whatwg_fetch: '*',
          },
        }
      )
    ).toEqual([
      '@react-native-community/blur',
      '@react-native/js-polyfills',
      '@react-native/virtualized-lists',
      'jest-react-native',
    ]);
  });

  it('materializes a flat transform cache under the Vitest cache directory and reuses it on the next build', async () => {
    const resolvedCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-cache-dir-'));
    const cache = await buildReactNativeTransformCache(process.cwd(), resolvedCacheDir);
    const cacheRoot = path.join(resolvedCacheDir, GRANITE_VITEST_RN_CACHE_DIRECTORY);
    const cacheEntriesRoot = path.join(cacheRoot, GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY);
    const secondCache = await buildReactNativeTransformCache(process.cwd(), resolvedCacheDir);

    expect(cache.objectsRoot).toContain(
      path.join(resolvedCacheDir, GRANITE_VITEST_RN_CACHE_DIRECTORY, GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY)
    );
    expect(secondCache.objectsRoot).toBe(cache.objectsRoot);
    expect(fs.existsSync(cache.objectsRoot)).toBe(true);
    expect(fs.existsSync(cache.manifestPath)).toBe(true);
    expect(fs.existsSync(cacheRoot)).toBe(true);
    expect(fs.existsSync(cacheEntriesRoot)).toBe(true);
    expect(path.basename(cache.objectsRoot)).toBe(GRANITE_VITEST_RN_OBJECTS_DIRECTORY);
    expect(path.basename(cache.manifestPath)).toBe(GRANITE_VITEST_RN_MANIFEST_FILENAME);

    const cacheBasenames = collectBasenames(cache.entryRoot);
    expect(cacheBasenames).not.toContain('packages');
    expect(cacheBasenames).not.toContain('package.json');
  }, 60_000);

  it('resolves React Native requests through the flat manifest', async () => {
    const resolvedCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-cache-dir-'));
    const cache = await buildReactNativeTransformCache(process.cwd(), resolvedCacheDir);
    const reactNative = resolveReactNativeModuleFromManifest('react-native', undefined, cache.manifest);
    const reactNativeManifest = resolveReactNativeModuleFromManifest(
      'react-native/package.json',
      undefined,
      cache.manifest
    );
    const platformShim = resolveReactNativeModuleFromManifest(
      'react-native/Libraries/Utilities/Platform.js',
      undefined,
      cache.manifest
    );
    const platformFallback = resolveReactNativeModuleFromManifest(
      './Platform',
      platformShim?.objectPath,
      cache.manifest
    );

    expect(reactNative?.objectPath).toMatch(new RegExp(`${GRANITE_VITEST_RN_OBJECTS_DIRECTORY}/[a-f0-9]+\\.js$`));
    expect(reactNativeManifest?.objectPath).toMatch(
      new RegExp(`${GRANITE_VITEST_RN_OBJECTS_DIRECTORY}/[a-f0-9]+\\.json$`)
    );
    expect(platformFallback?.sourcePath).toContain('Platform.ios.js');
    expect(path.basename(reactNativeManifest?.objectPath ?? '')).not.toBe('package.json');
  }, 60_000);
});
