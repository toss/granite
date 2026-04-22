import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as vite from 'vitest/node';
import {
  JEST_LIKE_TEST_PATTERNS,
  REACT_NATIVE_EXPORT_CONDITIONS,
  REACT_NATIVE_RESOLVE_EXTENSIONS,
  REACT_NATIVE_ASSET_EXTENSIONS,
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

async function runPluginConfig(plugin: ReturnType<typeof reactNative>, conf = {}) {
  const configHook = plugin.config;

  if (configHook == null) {
    throw new Error('reactNative plugin must expose a config hook');
  }

  if (typeof configHook === 'function') {
    return (await configHook.call({} as never, conf as never, {} as never)) as unknown as {
      resolve: { alias: Array<{ replacement: string }> };
      test: { setupFiles: string[] };
    };
  }

  return (await configHook.handler.call({} as never, conf as never, {} as never)) as unknown as {
    resolve: { alias: Array<{ replacement: string }> };
    test: { setupFiles: string[] };
  };
}

async function runPluginLoad(plugin: ReturnType<typeof reactNative>, id: string) {
  const loadHook = plugin.load;

  if (loadHook == null) {
    return undefined;
  }

  if (typeof loadHook === 'function') {
    return loadHook.call({} as never, id, undefined);
  }

  return loadHook.handler.call({} as never, id, undefined);
}

describe('reactNative', () => {
  it('returns shared JSX transform config for both oxc and esbuild', () => {
    expect(getVitestJsxTransformConfig()).toEqual({
      esbuild: {
        jsx: 'automatic',
        jsxImportSource: 'react',
      },
      oxc: {
        jsx: {
          importSource: 'react',
          runtime: 'automatic',
        },
      },
    });
  });

  it('provides a Vitest plugin-style config with packaged setup files', async () => {
    const plugin = reactNative();
    const config = await runPluginConfig(plugin, { cacheDir: '.vitest' });

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

    if ('rolldownVersion' in vite) {
      expect(config).toMatchObject({
        oxc: {
          jsx: {
            importSource: 'react',
            runtime: 'automatic',
          },
        },
      });
    } else {
      expect(config).toMatchObject({
        esbuild: {
          jsx: 'automatic',
          jsxImportSource: 'react',
        },
      });
    }

    for (const setupFile of config.test.setupFiles) {
      expect(fs.existsSync(setupFile)).toBe(true);
    }
  }, 60_000);

  it('resolves ios files before native fallbacks and then common files', () => {
    expect(REACT_NATIVE_RESOLVE_EXTENSIONS).toEqual([
      '.ios.tsx',
      '.ios.ts',
      '.ios.jsx',
      '.ios.js',
      '.native.tsx',
      '.native.ts',
      '.native.jsx',
      '.native.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ]);
  });

  it('mocks asset imports with `{ testUri }` objects', async () => {
    const plugin = reactNative();
    const assetModuleCode = await runPluginLoad(plugin, '/virtual/project/src/logo.png');

    expect(REACT_NATIVE_ASSET_EXTENSIONS).toContain('png');
    expect(assetModuleCode).toContain('testUri');
    expect(assetModuleCode).toContain('logo.png');
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

    expect(packageRoots.length).toBeGreaterThan(1);
    expect(packageRoots.some((packageRoot) => reactNativeEntryPath.startsWith(packageRoot))).toBe(true);
    expect(shouldInlineReactNativeDependency(reactNativeEntryPath, packageRoots)).toBe(true);
  });

  it('uses the config file directory as the workspace root when root is omitted', async () => {
    const originalCwd = process.cwd();
    const nestedCwd = path.join(originalCwd, 'src');
    const configFilePath = path.join(originalCwd, 'vitest.config.mts');

    process.chdir(nestedCwd);

    try {
      const plugin = reactNative();
      const config = await runPluginConfig(plugin, {
        cacheDir: '.vitest',
        configFile: configFilePath,
      });

      expect(config.resolve.alias[0]?.replacement).toContain(
        path.join(
          originalCwd,
          '.vitest',
          GRANITE_VITEST_RN_CACHE_DIRECTORY,
          GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
        ),
      );
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('reuses a content-addressed mirror entry when the inputs are unchanged', async () => {
    const workspaceRoot = process.cwd();
    const firstMirrorRoot = await buildReactNativeMirror(workspaceRoot);
    const secondMirrorRoot = await buildReactNativeMirror(workspaceRoot);
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
        workspaceRoot,
        '.vitest',
        GRANITE_VITEST_RN_CACHE_DIRECTORY,
        GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
      ),
    );
    expect(metadata.cacheKey).toBe(path.basename(firstEntryRoot));
    expect(metadata.packageRoots.length).toBeGreaterThan(0);
    expect(metadata.transformImplementationHash.length).toBeGreaterThan(0);
  }, 60_000);

  it('garbage-collects stale mirror entries while preserving the active one', async () => {
    const workspaceRoot = process.cwd();
    const activeMirrorRoot = await buildReactNativeMirror(workspaceRoot);
    const entriesRoot = path.join(
      workspaceRoot,
      '.vitest',
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

    await buildReactNativeMirror(workspaceRoot);

    expect(fs.existsSync(activeMirrorRoot)).toBe(true);
    expect(fs.existsSync(staleEntryRoot)).toBe(false);
  }, 60_000);
});
