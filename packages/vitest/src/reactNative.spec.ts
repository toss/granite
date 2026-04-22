import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import * as vite from 'vitest/node';
import {
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
  reactNative,
  synthesizeDefaultPlatformFiles,
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
    alias: Array<{ find: unknown; replacement: string }>;
    extensions: string[];
  };
  test: {
    environment?: string;
    globals?: boolean;
    setupFiles: string[];
  };
};

async function runPluginConfig(plugin: ReturnType<typeof reactNative>, conf = {}) {
  const configHook = plugin.config;

  if (configHook == null) {
    throw new Error('reactNative plugin must expose a config hook');
  }

  if (typeof configHook === 'function') {
    return (await configHook.call(
      {} as never,
      conf as never,
      {} as never,
    )) as unknown as PluginConfigResult;
  }

  return (await configHook.handler.call(
    {} as never,
    conf as never,
    {} as never,
  )) as unknown as PluginConfigResult;
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
        'globalThis.__GRANITE_VITEST_RN_CACHE_ROOT__': expect.stringContaining(
          path.join(
            workspaceRoot,
            '.vitest',
            GRANITE_VITEST_RN_CACHE_DIRECTORY,
            GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
          ),
        ),
      });
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
    const aliasPatterns = config.resolve.alias.map(({ find }) => String(find));
    expect(aliasPatterns).toEqual(
      expect.arrayContaining([
        '/^react-native$/',
        '/^@react-native\\/(.*)$/',
        '/^jest-react-native$/',
      ]),
    );
    expect(config.resolve.extensions).toEqual(
      expect.arrayContaining([
        '.android.tsx',
        '.android.ts',
        '.android.jsx',
        '.android.js',
      ]),
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
      'globalThis.__GRANITE_VITEST_RN_CACHE_ROOT__': expect.stringContaining(
        path.join(
          workspaceRoot,
          '.vitest',
          GRANITE_VITEST_RN_CACHE_DIRECTORY,
          GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
        ),
      ),
    });
  }, 60_000);

  it('loads React Native assets as tiny testUri modules', async () => {
    const plugin = reactNative();
    const assetModuleCode = await runPluginLoad(plugin, '/virtual/project/src/logo.png');

    expect(assetModuleCode).toContain('testUri');
    expect(assetModuleCode).toContain('logo.png');
  });

  it('materializes default platform files from platform-specific sources', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-platform-'));
    const buttonPath = path.join(temporaryRoot, 'Button.ios.tsx');
    const buttonFallbackPath = path.join(temporaryRoot, 'Button.tsx');
    const cardPath = path.join(temporaryRoot, 'Card.native.tsx');
    const cardFallbackPath = path.join(temporaryRoot, 'Card.tsx');
    const badgePath = path.join(temporaryRoot, 'Badge.android.tsx');
    const badgeFallbackPath = path.join(temporaryRoot, 'Badge.tsx');

    fs.writeFileSync(buttonPath, 'export default "ios";');
    fs.writeFileSync(cardPath, 'export default "native";');
    fs.writeFileSync(badgePath, 'export default "android";');

    synthesizeDefaultPlatformFiles(temporaryRoot);

    expect(fs.readFileSync(buttonFallbackPath, 'utf8')).toBe('export default "ios";');
    expect(fs.readFileSync(cardFallbackPath, 'utf8')).toBe('export default "native";');
    expect(fs.readFileSync(badgeFallbackPath, 'utf8')).toBe('export default "android";');
  });
});
