import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  JEST_LIKE_TEST_PATTERNS,
  REACT_NATIVE_EXPORT_CONDITIONS,
  REACT_NATIVE_RESOLVE_EXTENSIONS,
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  buildReactNativeMirror,
  getVitestJsxTransformConfig,
  reactNative,
  resolveReactNativePackageRoots,
  resolveReactNativeSetupFiles,
  shouldInlineReactNativeDependency,
  synthesizeDefaultPlatformFiles,
} from './reactNative';
import {
  isVitestVersionAtLeast,
  resolveInstalledVitestVersion,
  VITEST_VITE_8_SUPPORT_VERSION,
} from './vitestVersion';

describe('reactNative', () => {
  it('provides a Vitest plugin-style config with packaged setup files', () => {
    const plugin = reactNative({ workspaceRoot: process.cwd() });
    const config = plugin.config();

    expect(plugin.name).toBe('granite-react-native');
    expect(config).toMatchObject({
      resolve: {
        alias: expect.any(Array),
        conditions: [...REACT_NATIVE_EXPORT_CONDITIONS],
        extensions: [...REACT_NATIVE_RESOLVE_EXTENSIONS],
      },
      test: {
        environment: 'node',
        globals: true,
        include: [...JEST_LIKE_TEST_PATTERNS],
        setupFiles: resolveReactNativeSetupFiles(),
      },
    });

    expect(config).toMatchObject(getVitestJsxTransformConfig(resolveInstalledVitestVersion(process.cwd())));

    for (const setupFile of config.test.setupFiles) {
      expect(fs.existsSync(setupFile)).toBe(true);
    }
  }, 60_000);

  it('switches JSX transform config at Vitest 4.1.0', () => {
    expect(isVitestVersionAtLeast('4.0.12', VITEST_VITE_8_SUPPORT_VERSION)).toBe(false);
    expect(isVitestVersionAtLeast('4.1.0-beta.3', VITEST_VITE_8_SUPPORT_VERSION)).toBe(false);
    expect(isVitestVersionAtLeast('4.1.0-beta.4', VITEST_VITE_8_SUPPORT_VERSION)).toBe(true);
    expect(isVitestVersionAtLeast('4.1.0', VITEST_VITE_8_SUPPORT_VERSION)).toBe(true);
    expect(isVitestVersionAtLeast('4.1.3', VITEST_VITE_8_SUPPORT_VERSION)).toBe(true);

    expect(getVitestJsxTransformConfig('4.0.12')).toEqual({
      esbuild: {
        jsx: 'automatic',
        jsxImportSource: 'react',
      },
    });

    expect(getVitestJsxTransformConfig('4.1.0')).toEqual({
      oxc: {
        jsx: {
          runtime: 'automatic',
          importSource: 'react',
        },
      },
    });
  });

  it('prefers ios files when synthesizing default platform fallbacks', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-platform-'));
    const buttonPath = path.join(temporaryRoot, 'Button.ios.tsx');
    const buttonFallbackPath = path.join(temporaryRoot, 'Button.tsx');
    const cardPath = path.join(temporaryRoot, 'Card.native.tsx');
    const cardFallbackPath = path.join(temporaryRoot, 'Card.tsx');

    fs.writeFileSync(buttonPath, 'export default "ios";');
    fs.writeFileSync(cardPath, 'export default "native";');

    synthesizeDefaultPlatformFiles(temporaryRoot);

    expect(fs.readFileSync(buttonFallbackPath, 'utf8')).toBe('export default "ios";');
    expect(fs.readFileSync(cardFallbackPath, 'utf8')).toBe('export default "native";');
  });

  it('resolves React Native package roots through package resolution instead of node_modules assumptions', () => {
    const packageRequire = createRequire(path.join(process.cwd(), 'packages/vitest/package.json'));
    const reactNativeEntryPath = packageRequire.resolve('react-native/package.json');
    const packageRoots = resolveReactNativePackageRoots(process.cwd());

    expect(packageRoots.some((packageRoot) => reactNativeEntryPath.startsWith(packageRoot))).toBe(true);
    expect(shouldInlineReactNativeDependency(reactNativeEntryPath, packageRoots)).toBe(true);
  });

  it('reuses a content-addressed mirror entry when the inputs are unchanged', () => {
    const workspaceRoot = process.cwd();
    const firstMirrorRoot = buildReactNativeMirror(workspaceRoot);
    const secondMirrorRoot = buildReactNativeMirror(workspaceRoot);
    const firstEntryRoot = path.dirname(firstMirrorRoot);
    const metadataPath = path.join(firstEntryRoot, 'meta.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as {
      cacheKey: string;
      packageRoots: string[];
      transformImplementationHash: string;
    };

    expect(secondMirrorRoot).toBe(firstMirrorRoot);
    expect(firstMirrorRoot).toContain(
      path.join(
        GRANITE_VITEST_RN_CACHE_DIRECTORY,
        GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
      ),
    );
    expect(metadata.cacheKey).toBe(path.basename(firstEntryRoot));
    expect(metadata.packageRoots.length).toBeGreaterThan(0);
    expect(metadata.transformImplementationHash.length).toBeGreaterThan(0);
  }, 60_000);

  it('garbage-collects stale mirror entries while preserving the active one', () => {
    const workspaceRoot = process.cwd();
    const activeMirrorRoot = buildReactNativeMirror(workspaceRoot);
    const entriesRoot = path.join(
      workspaceRoot,
      GRANITE_VITEST_RN_CACHE_DIRECTORY,
      GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
    );
    const staleEntryRoot = path.join(entriesRoot, 'stale-entry-for-gc');
    const stalePackagesRoot = path.join(staleEntryRoot, 'packages');

    fs.rmSync(staleEntryRoot, { force: true, recursive: true });
    fs.mkdirSync(stalePackagesRoot, { recursive: true });
    fs.writeFileSync(path.join(stalePackagesRoot, 'placeholder.js'), 'module.exports = 1;\n');
    fs.writeFileSync(
      path.join(staleEntryRoot, 'meta.json'),
      JSON.stringify(
        {
          cacheKey: 'stale-entry-for-gc',
          createdAt: '2000-01-01T00:00:00.000Z',
          lastAccessedAt: '2000-01-01T00:00:00.000Z',
          packageRoots: [],
          sizeBytes: 16,
          transformDependencyVersions: {
            fastFlowTransform: '0.0.0',
          },
          transformImplementationHash: 'stale',
        },
        null,
        2,
      ),
    );

    buildReactNativeMirror(workspaceRoot);

    expect(fs.existsSync(activeMirrorRoot)).toBe(true);
    expect(fs.existsSync(staleEntryRoot)).toBe(false);
  }, 60_000);
});
