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
  it('uses cacheDir without treating it as the workspace root', async () => {
    const cacheDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-cache-dir-'));
    const mirrorRoot = await buildReactNativeMirror(process.cwd(), cacheDirectory);

    expect(mirrorRoot).toContain(
      path.join(cacheDirectory, GRANITE_VITEST_RN_CACHE_DIRECTORY, GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY),
    );
    expect(fs.existsSync(mirrorRoot)).toBe(true);
  }, 60_000);
});
