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

describe('collectMirroredReactNativePackageNames', () => {
  it('collects RN-family packages from both RN and workspace manifests', () => {
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
});

describe('buildReactNativeMirror', () => {
  it('uses a resolved cache dir without treating it as the workspace root', async () => {
    const resolvedCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-cache-dir-'));
    const mirrorRoot = await buildReactNativeMirror(process.cwd(), resolvedCacheDir);

    expect(mirrorRoot).toContain(
      path.join(
        resolvedCacheDir,
        GRANITE_VITEST_RN_CACHE_DIRECTORY,
        GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
      ),
    );
    expect(fs.existsSync(mirrorRoot)).toBe(true);
  }, 60_000);
});
