import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildReactNativeTransformCache,
  GRANITE_VITEST_RN_CACHE_DIRECTORY,
  GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY,
} from './reactNative';

describe('reactNativeRuntime bootstrap', () => {
  let ReactNative: Record<string, any>;
  let RendererProxy: Record<string, any>;
  const runtimeGlobals = globalThis as typeof globalThis & {
    __DEV__?: boolean;
    __GRANITE_VITEST_RN_CACHE_MANIFEST__?: string;
    IS_REACT_ACT_ENVIRONMENT?: boolean;
    IS_REACT_NATIVE_TEST_ENVIRONMENT?: boolean;
    ErrorUtils?: Record<string, unknown>;
    nativeFabricUIManager?: Record<string, unknown>;
    window?: typeof globalThis;
  };
  const originalManifestPath = runtimeGlobals.__GRANITE_VITEST_RN_CACHE_MANIFEST__;
  const originalErrorUtils = runtimeGlobals.ErrorUtils;

  afterAll(() => {
    if (originalManifestPath == null) {
      delete runtimeGlobals.__GRANITE_VITEST_RN_CACHE_MANIFEST__;
    } else {
      runtimeGlobals.__GRANITE_VITEST_RN_CACHE_MANIFEST__ = originalManifestPath;
    }

    if (originalErrorUtils == null) {
      delete runtimeGlobals.ErrorUtils;
    } else {
      runtimeGlobals.ErrorUtils = originalErrorUtils;
    }
  });

  it('fails fast when reactNative() did not configure the mirror cache root', async () => {
    delete runtimeGlobals.__GRANITE_VITEST_RN_CACHE_MANIFEST__;
    vi.resetModules();

    await expect(import('./reactNativeRuntime')).rejects.toThrow(
      'reactNativeRuntime requires reactNative() in vitest.config'
    );
  });

  describe('with a configured mirror cache root', () => {
    beforeAll(async () => {
      const cache = await buildReactNativeTransformCache(process.cwd());

      runtimeGlobals.__GRANITE_VITEST_RN_CACHE_MANIFEST__ = cache.manifestPath;
      vi.resetModules();

      await import('./reactNativeRuntime');
      ReactNative = await import('react-native');
      RendererProxy = await import('react-native/Libraries/ReactNative/RendererProxy');
    });

    it('installs the React Native test globals needed to boot the runtime', () => {
      expect(runtimeGlobals.__DEV__).toBe(true);
      expect(runtimeGlobals.IS_REACT_ACT_ENVIRONMENT).toBe(true);
      expect(runtimeGlobals.IS_REACT_NATIVE_TEST_ENVIRONMENT).toBe(true);
      expect(runtimeGlobals.window).toBe(runtimeGlobals);
      expect(runtimeGlobals.nativeFabricUIManager).toEqual({});
      expect(runtimeGlobals.performance.now).toEqual(expect.any(Function));
      expect(runtimeGlobals.requestAnimationFrame).toEqual(expect.any(Function));
      expect(runtimeGlobals.cancelAnimationFrame).toEqual(expect.any(Function));
      expect(runtimeGlobals.ErrorUtils).toMatchObject({
        applyWithGuard: expect.any(Function),
        applyWithGuardIfNeeded: expect.any(Function),
        getGlobalHandler: expect.any(Function),
        guard: expect.any(Function),
        inGuard: expect.any(Function),
        reportError: expect.any(Function),
        reportFatalError: expect.any(Function),
        setGlobalHandler: expect.any(Function),
      });
    });

    it('exposes a representative React Native facade for tests', () => {
      expect(ReactNative.unstable_NativeText).toBeDefined();
      expect(ReactNative.unstable_NativeView).toBeDefined();
      expect(ReactNative.unstable_TextAncestorContext).toBeDefined();
      expect(ReactNative.unstable_VirtualView).toBeDefined();
      expect(ReactNative.usePressability).toEqual(expect.any(Function));
      expect(ReactNative.NativeComponentRegistry).toBeDefined();

      expect(ReactNative.unstable_TextAncestorContext.displayName).toBe('TextAncestorContext');
      expect(ReactNative.NativeComponentRegistry).toMatchObject({
        get: expect.any(Function),
        setRuntimeConfigProvider: expect.any(Function),
      });
      expect(ReactNative.usePressability(null)).toBeNull();
      expect(
        ReactNative.usePressability({
          onBlur: () => undefined,
          onPress: () => undefined,
          unstable_pressDelay: 10,
        })
      ).toEqual({
        onBlur: expect.any(Function),
        onPress: expect.any(Function),
      });
      expect(ReactNative.VirtualViewMode).toMatchObject({
        Hidden: expect.any(Number),
        Prerender: expect.any(Number),
        Visible: expect.any(Number),
      });
      expect(ReactNative.ReactNativeVersion.getVersionString()).toEqual(expect.any(String));
    });

    it('matches the React Native AppState contract shape', () => {
      expect(ReactNative.AppState).toMatchObject({
        addEventListener: expect.any(Function),
        removeEventListener: expect.any(Function),
      });
      expect(ReactNative.AppState.currentState).toBe('active');
    });

    it('provides the renderer bridge RN test helpers expect', () => {
      expect(RendererProxy).toMatchObject({
        findNodeHandle: expect.any(Function),
        unstable_batchedUpdates: expect.any(Function),
      });
    });

    it('does not treat an existing mirror cache entry as the source package roots', async () => {
      const resolvedCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-runtime-cache-'));
      const cache = await buildReactNativeTransformCache(process.cwd(), resolvedCacheDir);
      const metadataPath = path.join(cache.entryRoot, 'meta.json');
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8')) as {
        packageRoots: string[];
      };
      const cacheEntriesPath = path.join(GRANITE_VITEST_RN_CACHE_DIRECTORY, GRANITE_VITEST_RN_CACHE_ENTRIES_DIRECTORY);

      expect(metadata.packageRoots).toEqual(expect.not.arrayContaining([expect.stringContaining(cacheEntriesPath)]));
    });

    it('stores transformed React Native files without package boundaries', async () => {
      const resolvedCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'granite-vitest-runtime-cache-'));
      const cache = await buildReactNativeTransformCache(process.cwd(), resolvedCacheDir);
      const cacheEntryBasenames = fs
        .readdirSync(cache.entryRoot, { recursive: true })
        .map((entry) => path.basename(String(entry)));

      expect(cacheEntryBasenames).not.toContain('packages');
      expect(cacheEntryBasenames).not.toContain('package.json');
    });
  });
});
