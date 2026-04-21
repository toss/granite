/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars */
// @ts-nocheck
import { vi } from 'vitest';

export type NativeModuleMap = Record<string, any>;

export type RuntimeGlobals = typeof globalThis & {
  __DEV__?: boolean;
  __fbBatchedBridgeConfig?: { remoteModuleConfig: unknown[] };
  __rntlCallableModules?: {
    callable: Record<string, unknown>;
    lazy: Record<string, () => unknown>;
  };
  __rntlVitestRnResolverPatched__?: boolean;
  __turboModuleProxy?: (name: string) => unknown;
  IS_REACT_ACT_ENVIRONMENT?: boolean;
  IS_REACT_NATIVE_TEST_ENVIRONMENT?: boolean;
  RN$Bridgeless?: boolean;
  RN$registerCallableModule?: (name: string, moduleFactory: () => unknown) => void;
  nativeFabricUIManager?: Record<string, unknown>;
  nativeModuleProxy?: NativeModuleMap;
  jest?: { now?: () => number };
  window?: unknown;
};

export function defineGlobalProperty<Key extends keyof RuntimeGlobals>(
  runtimeGlobals: RuntimeGlobals,
  key: Key,
  value: NonNullable<RuntimeGlobals[Key]>,
) {
  Object.defineProperty(runtimeGlobals, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function createViewManagerConfig(name: string) {
  return {
    Commands: {},
    Constants: {},
    Manager: name,
    NativeProps: {},
    bubblingEventTypes: {},
    directEventTypes: {},
    uiViewClassName: name,
    validAttributes: {},
  };
}

export function installReactNativeGlobals(runtimeGlobals: RuntimeGlobals) {
  const windowEventListeners = new Map<string, Set<(event: unknown) => void>>();

  defineGlobalProperty(runtimeGlobals, 'IS_REACT_ACT_ENVIRONMENT', true);
  defineGlobalProperty(runtimeGlobals, 'IS_REACT_NATIVE_TEST_ENVIRONMENT', true);
  defineGlobalProperty(runtimeGlobals, '__DEV__', true);
  defineGlobalProperty(runtimeGlobals, 'window', runtimeGlobals as any);
  defineGlobalProperty(runtimeGlobals, 'nativeFabricUIManager', {});
  defineGlobalProperty(
    runtimeGlobals,
    'addEventListener' as keyof RuntimeGlobals,
    vi.fn((type: string, listener: (event: unknown) => void) => {
      const listeners = windowEventListeners.get(type) ?? new Set();
      listeners.add(listener);
      windowEventListeners.set(type, listeners);
    }) as any,
  );
  defineGlobalProperty(
    runtimeGlobals,
    'removeEventListener' as keyof RuntimeGlobals,
    vi.fn((type: string, listener: (event: unknown) => void) => {
      windowEventListeners.get(type)?.delete(listener);
    }) as any,
  );
  defineGlobalProperty(
    runtimeGlobals,
    'dispatchEvent' as keyof RuntimeGlobals,
    vi.fn((event: { type?: string }) => {
      if (event?.type != null) {
        windowEventListeners.get(event.type)?.forEach((listener) => listener(event));
      }

      return true;
    }) as any,
  );

  Object.defineProperty(runtimeGlobals, 'performance', {
    configurable: true,
    enumerable: true,
    value: {
      now: vi.fn(Date.now),
    },
    writable: true,
  });

  Object.defineProperty(runtimeGlobals, 'requestAnimationFrame', {
    configurable: true,
    enumerable: true,
    value: (callback: (time: number) => void) =>
      setTimeout(() => callback(runtimeGlobals.jest?.now?.() ?? Date.now()), 0),
    writable: true,
  });

  Object.defineProperty(runtimeGlobals, 'cancelAnimationFrame', {
    configurable: true,
    enumerable: true,
    value: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    writable: true,
  });
}

export function installNativeModuleProxy(runtimeGlobals: RuntimeGlobals) {
  const dimensions = {
    screen: {
      fontScale: 2,
      height: 1334,
      scale: 2,
      width: 750,
    },
    window: {
      fontScale: 2,
      height: 1334,
      scale: 2,
      width: 750,
    },
  };

  const viewManagerConfigs: Record<string, ReturnType<typeof createViewManagerConfig>> = {
    AndroidDrawerLayout: {
      ...createViewManagerConfig('AndroidDrawerLayout'),
      Constants: {
        DrawerPosition: {
          Left: 10,
        },
      },
    },
    AndroidTextInput: {
      ...createViewManagerConfig('AndroidTextInput'),
      Commands: {},
    },
    RCTMultilineTextInputView: createViewManagerConfig('RCTMultilineTextInputView'),
    RCTSafeAreaView: createViewManagerConfig('RCTSafeAreaView'),
    RCTScrollView: createViewManagerConfig('RCTScrollView'),
    RCTSinglelineTextInputView: createViewManagerConfig('RCTSinglelineTextInputView'),
    RCTText: createViewManagerConfig('RCTText'),
    RCTView: createViewManagerConfig('RCTView'),
    RCTVirtualText: createViewManagerConfig('RCTVirtualText'),
    ScrollView: createViewManagerConfig('ScrollView'),
    Text: createViewManagerConfig('Text'),
    View: createViewManagerConfig('View'),
  };

  const uiManager: Record<string, any> = {
    AndroidDrawerLayout: {
      Constants: {
        DrawerPosition: {
          Left: 10,
        },
      },
    },
    AndroidViewPager: {
      Commands: {
        setPage: vi.fn(),
        setPageWithoutAnimation: vi.fn(),
      },
    },
    AndroidTextInput: {
      Commands: {},
    },
    ScrollView: {
      Constants: {},
    },
    View: {
      Constants: {},
    },
    blur: vi.fn(),
    createView: vi.fn(),
    customBubblingEventTypes: {},
    customDirectEventTypes: {},
    dispatchViewManagerCommand: vi.fn(),
    focus: vi.fn(),
    lazilyLoadView: vi.fn(() => null),
    manageChildren: vi.fn(),
    measure: vi.fn(),
    measureInWindow: vi.fn(),
    measureLayout: vi.fn(),
    measureLayoutRelativeToParent: vi.fn(),
    setChildren: vi.fn(),
    updateView: vi.fn(),
  };

  uiManager.getConstants = vi.fn(() => viewManagerConfigs);
  uiManager.getConstantsForViewManager = vi.fn(
    (name: string) => viewManagerConfigs[name] ?? createViewManagerConfig(name),
  );
  uiManager.getViewManagerConfig = vi.fn(
    (name: string) => viewManagerConfigs[name] ?? uiManager.getConstantsForViewManager(name),
  );
  uiManager.hasViewManagerConfig = vi.fn((name: string) => uiManager.getViewManagerConfig(name) != null);

  const nativeAnimatedModule = {
    addAnimatedEventToView: vi.fn(),
    addListener: vi.fn(),
    connectAnimatedNodeToView: vi.fn(),
    connectAnimatedNodes: vi.fn(),
    createAnimatedNode: vi.fn(),
    disconnectAnimatedNodeFromView: vi.fn(),
    disconnectAnimatedNodes: vi.fn(),
    dropAnimatedNode: vi.fn(),
    extractAnimatedNodeOffset: vi.fn(),
    finishOperationBatch: vi.fn(),
    flattenAnimatedNodeOffset: vi.fn(),
    getValue: vi.fn(),
    queueAndExecuteBatchedOperations: vi.fn(),
    removeAnimatedEventFromView: vi.fn(),
    removeListener: vi.fn(),
    removeListeners: vi.fn(),
    restoreDefaultValues: vi.fn(),
    setAnimatedNodeOffset: vi.fn(),
    setAnimatedNodeValue: vi.fn(),
    startAnimatingNode: vi.fn(
      (
        animationId: number,
        nodeTag: number,
        config: Record<string, unknown>,
        endCallback?: (result: { finished: boolean }) => void,
      ) => {
        setTimeout(() => endCallback?.({ finished: true }), 16);
      },
    ),
    startListeningToAnimatedNodeValue: vi.fn(),
    startOperationBatch: vi.fn(),
    stopAnimation: vi.fn(),
    stopListeningToAnimatedNodeValue: vi.fn(),
    updateAnimatedNodeConfig: vi.fn(),
  };

  const nativeModuleProxy: NativeModuleMap = {
    AlertManager: {
      alertWithArgs: vi.fn(),
    },
    AsyncLocalStorage: {
      clear: vi.fn((callback?: (error: null) => void) => process.nextTick(() => callback?.(null))),
      getAllKeys: vi.fn((callback: (error: null, keys: string[]) => void) =>
        process.nextTick(() => callback(null, [])),
      ),
      multiGet: vi.fn((keys: string[], callback: (error: null, entries: string[][]) => void) =>
        process.nextTick(() => callback(null, [])),
      ),
      multiMerge: vi.fn((entries: string[][], callback?: (error: null) => void) =>
        process.nextTick(() => callback?.(null)),
      ),
      multiRemove: vi.fn((keys: string[], callback?: (error: null) => void) =>
        process.nextTick(() => callback?.(null)),
      ),
      multiSet: vi.fn((entries: string[][], callback?: (error: null) => void) =>
        process.nextTick(() => callback?.(null)),
      ),
    },
    BlobModule: {
      addNetworkingHandler: vi.fn(),
      createFromParts: vi.fn(),
      disableBlobSupport: vi.fn(),
      enableBlobSupport: vi.fn(),
      getConstants: () => ({ BLOB_URI_HOST: null, BLOB_URI_SCHEME: 'content' }),
      release: vi.fn(),
      sendBlob: vi.fn(),
    },
    DevSettings: {
      addMenuItem: vi.fn(),
      reload: vi.fn(),
    },
    DeviceInfo: {
      getConstants: () => ({
        Dimensions: dimensions,
      }),
    },
    I18nManager: {
      allowRTL: vi.fn(),
      forceRTL: vi.fn(),
      getConstants: () => ({
        doLeftAndRightSwapInRTL: true,
        isRTL: false,
        localeIdentifier: 'en_US',
      }),
      swapLeftAndRightInRTL: vi.fn(),
    },
    ImageLoader: {
      getSize: vi.fn((url: string) => Promise.resolve([320, 240])),
      getSizeWithHeaders: vi.fn((url: string, headers: Record<string, string>) =>
        Promise.resolve({ height: 222, width: 333 }),
      ),
      prefetchImage: vi.fn(),
      prefetchImageWithMetadata: vi.fn(),
      queryCache: vi.fn(),
    },
    ImageViewManager: {
      getSize: vi.fn((uri: string, success: (width: number, height: number) => void) =>
        process.nextTick(() => success(320, 240)),
      ),
      prefetchImage: vi.fn(),
    },
    KeyboardObserver: {
      addListener: vi.fn(),
      removeListeners: vi.fn(),
    },
    NativeAnimatedModule: nativeAnimatedModule,
    Networking: {
      abortRequest: vi.fn(),
      addListener: vi.fn(),
      removeListeners: vi.fn(),
      sendRequest: vi.fn(),
    },
    PlatformConstants: {
      getConstants: () => ({
        forceTouchAvailable: false,
        interfaceIdiom: 'phone',
        isDisableAnimations: false,
        isMacCatalyst: false,
        isTesting: true,
        osVersion: '17.0',
        reactNativeVersion: {
          major: 0,
          minor: 79,
          patch: 5,
          prerelease: undefined,
        },
        systemName: 'iOS',
      }),
    },
    PushNotificationManager: {
      abandonPermissions: vi.fn(),
      addListener: vi.fn(),
      cancelAllLocalNotifications: vi.fn(),
      cancelLocalNotifications: vi.fn(),
      checkPermissions: vi.fn((callback: (permissions: { alert: boolean; badge: boolean; sound: boolean }) => void) =>
        process.nextTick(() => callback({ alert: true, badge: true, sound: true })),
      ),
      getApplicationIconBadgeNumber: vi.fn((callback: (badge: number) => void) =>
        process.nextTick(() => callback(0)),
      ),
      getDeliveredNotifications: vi.fn((callback: (notifications: unknown[]) => void) =>
        process.nextTick(() => callback([])),
      ),
      getInitialNotification: vi.fn(() => Promise.resolve(null)),
      getScheduledLocalNotifications: vi.fn((callback?: () => void) =>
        process.nextTick(() => callback?.()),
      ),
      presentLocalNotification: vi.fn(),
      removeAllDeliveredNotifications: vi.fn(),
      removeDeliveredNotifications: vi.fn(),
      removeListeners: vi.fn(),
      requestPermissions: vi.fn(() =>
        Promise.resolve({ alert: true, badge: true, sound: true }),
      ),
      scheduleLocalNotification: vi.fn(),
      setApplicationIconBadgeNumber: vi.fn(),
    },
    SourceCode: {
      getConstants: () => ({
        scriptURL: null,
      }),
    },
    StatusBarManager: {
      getConstants: () => ({
        HEIGHT: 42,
      }),
      setBackgroundColor: vi.fn(),
      setColor: vi.fn(),
      setHidden: vi.fn(),
      setNetworkActivityIndicatorVisible: vi.fn(),
      setStyle: vi.fn(),
      setTranslucent: vi.fn(),
    },
    Timing: {
      createTimer: vi.fn(),
      deleteTimer: vi.fn(),
    },
    UIManager: uiManager,
    WebSocketModule: {
      addListener: vi.fn(),
      close: vi.fn(),
      connect: vi.fn(),
      ping: vi.fn(),
      removeListeners: vi.fn(),
      send: vi.fn(),
      sendBinary: vi.fn(),
    },
  };

  defineGlobalProperty(runtimeGlobals, 'nativeModuleProxy', nativeModuleProxy);
  defineGlobalProperty(runtimeGlobals, '__turboModuleProxy', (name: string) => nativeModuleProxy[name] ?? null);
  defineGlobalProperty(runtimeGlobals, '__fbBatchedBridgeConfig', { remoteModuleConfig: [] });
}
