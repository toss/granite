import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildReactNativeMirror,
  collectMirroredReactNativePackageNames,
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
} from './mirror';

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
        },
      ),
    ).toEqual([
      '@react-native-community/blur',
      '@react-native/js-polyfills',
      '@react-native/virtualized-lists',
      'jest-react-native',
    ]);
  });

  it('materializes the mirror under the Vitest cache directory and reuses it on the next build', async () => {
    const resolvedCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-cache-dir-'));
    const mirrorRoot = await buildReactNativeMirror(process.cwd(), resolvedCacheDir);
    const cacheRoot = path.join(resolvedCacheDir, GRANITE_VITEST_RN_CACHE_DIRECTORY);
    const cacheEntriesRoot = path.join(cacheRoot, GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY);
    const secondMirrorRoot = await buildReactNativeMirror(process.cwd(), resolvedCacheDir);

    expect(mirrorRoot).toContain(
      path.join(
        resolvedCacheDir,
        GRANITE_VITEST_RN_CACHE_DIRECTORY,
        GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
      ),
    );
    expect(secondMirrorRoot).toBe(mirrorRoot);
    expect(fs.existsSync(mirrorRoot)).toBe(true);
    expect(fs.existsSync(cacheRoot)).toBe(true);
    expect(fs.existsSync(cacheEntriesRoot)).toBe(true);
  }, 60_000);
});
