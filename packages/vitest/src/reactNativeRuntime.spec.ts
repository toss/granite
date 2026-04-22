import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildReactNativeMirror } from './reactNative';

vi.mock('@react-native/js-polyfills/error-guard', () => ({}));

describe('reactNativeRuntime parity surface', () => {
  let ReactNative: Record<string, any>;
  let RendererProxy: Record<string, any>;
  const originalMirrorRoot = process.env.GRANITE_VITEST_RN_CACHE_ROOT;

  beforeAll(async () => {
    const mirrorRoot = await buildReactNativeMirror(process.cwd());

    process.env.GRANITE_VITEST_RN_CACHE_ROOT = mirrorRoot;
    vi.resetModules();

    await import('./reactNativeRuntime');
    ReactNative = await import('react-native');
    RendererProxy = await import('react-native/Libraries/ReactNative/RendererProxy');
  });

  afterAll(() => {
    if (originalMirrorRoot == null) {
      delete process.env.GRANITE_VITEST_RN_CACHE_ROOT;
      return;
    }

    process.env.GRANITE_VITEST_RN_CACHE_ROOT = originalMirrorRoot;
  });

  it('exposes the remaining top-level React Native facade exports', () => {
    expect(ReactNative).toHaveProperty('unstable_NativeText');
    expect(ReactNative).toHaveProperty('unstable_NativeView');
    expect(ReactNative).toHaveProperty('unstable_TextAncestorContext');
    expect(ReactNative).toHaveProperty('unstable_VirtualView');
    expect(ReactNative).toHaveProperty('NativeComponentRegistry');
    expect(ReactNative).toHaveProperty('ReactNativeVersion');
    expect(ReactNative).toHaveProperty('usePressability');
    expect(ReactNative).toHaveProperty('VirtualViewMode');

    expect(ReactNative.unstable_TextAncestorContext.displayName).toBe('TextAncestorContext');
    expect(ReactNative.NativeComponentRegistry).toMatchObject({
      get: expect.any(Function),
      getWithFallback_DEPRECATED: expect.any(Function),
      setRuntimeConfigProvider: expect.any(Function),
      unstable_hasStaticViewConfig: expect.any(Function),
    });
    expect(ReactNative.ReactNativeVersion.getVersionString()).toBe(
      `${ReactNative.ReactNativeVersion.major}.${ReactNative.ReactNativeVersion.minor}.${ReactNative.ReactNativeVersion.patch}${ReactNative.ReactNativeVersion.prerelease != null ? `-${ReactNative.ReactNativeVersion.prerelease}` : ''}`,
    );
    expect(ReactNative.usePressability(null)).toBeNull();
    expect(
      ReactNative.usePressability({
        onBlur: () => undefined,
        onPress: () => undefined,
        unstable_pressDelay: 10,
      }),
    ).toEqual({
      onBlur: expect.any(Function),
      onPress: expect.any(Function),
    });
    expect(ReactNative.VirtualViewMode).toEqual({
      Hidden: 2,
      Prerender: 1,
      Visible: 0,
    });
  });

  it('fills out the RendererProxy mock surface expected by RN Jest', () => {
    expect(RendererProxy).toMatchObject({
      dispatchCommand: expect.any(Function),
      findHostInstance_DEPRECATED: expect.any(Function),
      findNodeHandle: expect.any(Function),
      getNodeFromInternalInstanceHandle: expect.any(Function),
      getPublicInstanceFromInternalInstanceHandle: expect.any(Function),
      getPublicInstanceFromRootTag: expect.any(Function),
      isChildPublicInstance: expect.any(Function),
      isProfilingRenderer: expect.any(Function),
      renderElement: expect.any(Function),
      sendAccessibilityEvent: expect.any(Function),
      unmountComponentAtNodeAndRemoveContainer: expect.any(Function),
      unstable_batchedUpdates: expect.any(Function),
    });
  });
});
