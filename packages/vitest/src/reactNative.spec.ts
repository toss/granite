import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  JEST_LIKE_TEST_PATTERNS,
  REACT_NATIVE_EXPORT_CONDITIONS,
  REACT_NATIVE_RESOLVE_EXTENSIONS,
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
});
