import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergeConfig } from 'vitest/config';
import * as vite from 'vitest/node';
import {
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  GRANITE_VITEST_RN_MANIFEST_FILENAME,
  JEST_LIKE_TEST_PATTERNS,
  reactNative,
  resolveReactNativeSetupFiles,
} from './reactNative';

type PluginConfigResult = {
  define?: Record<string, string>;
  esbuild?: {
    jsx: string;
    jsxImportSource: string;
  };
  oxc?: {
    jsx: {
      importSource: string;
      runtime: string;
    };
  };
  resolve: {
    alias?: Array<{ find: unknown; replacement: string }>;
    conditions?: string[];
    extensions: string[];
  };
  test: {
    environment?: string;
    globals?: boolean;
    include?: string[];
    setupFiles: string[];
  };
};

async function runPluginConfig(plugin: ReturnType<typeof reactNative>, conf = {}) {
  const configHook = plugin.config;

  if (configHook == null) {
    throw new Error('reactNative plugin must expose a config hook');
  }

  if (typeof configHook === 'function') {
    return (await configHook.call({} as never, conf as never, {} as never)) as unknown as PluginConfigResult;
  }

  return (await configHook.handler.call({} as never, conf as never, {} as never)) as unknown as PluginConfigResult;
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

async function runPluginResolveId(plugin: ReturnType<typeof reactNative>, id: string, importer?: string) {
  const resolveIdHook = plugin.resolveId;

  if (resolveIdHook == null) {
    return undefined;
  }

  if (typeof resolveIdHook === 'function') {
    return resolveIdHook.call({} as never, id, importer, {} as never);
  }

  return resolveIdHook.handler.call({} as never, id, importer, {} as never);
}

describe('reactNative plugin', () => {
  it('prefers test.root when root is missing', async () => {
    const plugin = reactNative();
    const workspaceRoot = process.cwd();
    const temporaryCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-cwd-'));
    const originalCwd = process.cwd();

    try {
      process.chdir(temporaryCwd);

      const config = await runPluginConfig(plugin, {
        root: undefined,
        test: {
          root: workspaceRoot,
        },
      });

      expect(config.define).toMatchObject({
        'globalThis.__GRANITE_VITEST_RN_CACHE_MANIFEST__': expect.stringContaining(
          path.join(
            workspaceRoot,
            '.vitest',
            GRANITE_VITEST_RN_CACHE_DIRECTORY,
            GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY
          )
        ),
      });
      expect(config.define?.['globalThis.__GRANITE_VITEST_RN_CACHE_MANIFEST__']).toContain(
        GRANITE_VITEST_RN_MANIFEST_FILENAME
      );
    } finally {
      process.chdir(originalCwd);
    }
  }, 60_000);

  it('turns a Vitest config into a React Native-ready workspace setup', async () => {
    const workspaceRoot = process.cwd();
    const plugin = reactNative();
    const config = await runPluginConfig(plugin, {
      cacheDir: '.vitest',
    });

    expect(plugin.name).toBe('granite-react-native');
    expect(config.test).toMatchObject({
      environment: 'node',
      globals: true,
    });
    expect(config.resolve.alias).toBeUndefined();
    expect(config.resolve.extensions).toEqual(
      expect.arrayContaining(['.android.tsx', '.android.ts', '.android.jsx', '.android.js'])
    );
    expect(config.test.setupFiles).toHaveLength(2);
    for (const setupFile of config.test.setupFiles) {
      expect(fs.existsSync(setupFile)).toBe(true);
    }

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

    expect(config.define).toMatchObject({
      'globalThis.__GRANITE_VITEST_RN_CACHE_MANIFEST__': expect.stringContaining(
        path.join(
          workspaceRoot,
          '.vitest',
          GRANITE_VITEST_RN_CACHE_DIRECTORY,
          GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY
        )
      ),
    });
    expect(config.define?.['globalThis.__GRANITE_VITEST_RN_CACHE_MANIFEST__']).toContain(
      GRANITE_VITEST_RN_MANIFEST_FILENAME
    );
  }, 60_000);

  it('preserves caller resolve and test config when Vitest merges plugin output', async () => {
    const plugin = reactNative();
    const callerConfig = {
      resolve: {
        alias: [{ find: '@', replacement: '/virtual/src' }],
        conditions: ['custom-condition'],
        extensions: ['.mjs'],
      },
      test: {
        include: ['custom.test.ts'],
        setupFiles: ['/virtual/setup.ts'],
      },
    };
    const pluginConfig = await runPluginConfig(plugin, {});
    const mergedConfig = mergeConfig(callerConfig, pluginConfig) as PluginConfigResult;

    expect(mergedConfig.resolve.alias?.map(({ find }) => String(find))).toEqual(expect.arrayContaining(['@']));
    expect(mergedConfig.resolve.conditions).toEqual(
      expect.arrayContaining(['custom-condition', 'require', 'react-native'])
    );
    expect(mergedConfig.resolve.extensions).toEqual(expect.arrayContaining(['.mjs', '.ios.tsx', '.android.tsx']));
    expect(mergedConfig.test.include).toEqual(expect.arrayContaining(['custom.test.ts', ...JEST_LIKE_TEST_PATTERNS]));
    expect(mergedConfig.test.setupFiles).toEqual(
      expect.arrayContaining(['/virtual/setup.ts', ...resolveReactNativeSetupFiles()])
    );
  });

  it('loads React Native assets as tiny testUri modules', async () => {
    const plugin = reactNative();
    const assetModuleCode = await runPluginLoad(plugin, '/virtual/project/src/logo.png');

    expect(assetModuleCode).toContain('testUri');
    expect(assetModuleCode).toContain('logo.png');
  });

  it('resolves React Native modules through plugin resolveId without aliases', async () => {
    const plugin = reactNative();
    await runPluginConfig(plugin, {
      cacheDir: fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-plugin-cache-')),
    });

    const resolvedReactNative = await runPluginResolveId(plugin, 'react-native');
    const platformShim = await runPluginResolveId(plugin, 'react-native/Libraries/Utilities/Platform.js');
    const platformFallback = await runPluginResolveId(plugin, './Platform', String(platformShim));

    expect(String(resolvedReactNative)).toMatch(/[a-f0-9]+\.js$/);
    expect(String(platformShim)).toMatch(/[a-f0-9]+\.js$/);
    expect(String(platformFallback)).toMatch(/[a-f0-9]+\.js$/);
    expect(platformFallback).not.toBe(platformShim);
  }, 60_000);
});
