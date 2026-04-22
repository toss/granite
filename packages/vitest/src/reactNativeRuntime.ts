/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/member-ordering, @typescript-eslint/no-inferrable-types, @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-unused-vars, import/order */
// @ts-nocheck
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import '@react-native/js-polyfills/error-guard';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import {
  createReactNativeAssetModuleValue,
  isReactNativeAssetModuleId,
} from './assets';
import {
  defineGlobalProperty,
  installNativeModuleProxy,
  installReactNativeGlobals,
  type RuntimeGlobals,
} from './runtimeBootstrap';

type ModuleWithPrivateResolver = typeof Module & {
  _load: (request: string, parent: any, isMain: boolean) => unknown;
  _resolveFilename: (
    request: string,
    parent: any,
    isMain: boolean,
    options?: Record<string, unknown>,
  ) => string;
};

type ReactModule = typeof import('react');

const runtimeGlobals = globalThis as RuntimeGlobals;
const runtimeRequire = createRequire(import.meta.url);
const reactNativeMirrorRoot =
  typeof globalThis.__GRANITE_VITEST_RN_CACHE_ROOT__ === 'string'
    ? path.resolve(globalThis.__GRANITE_VITEST_RN_CACHE_ROOT__)
    : path.resolve(
        process.cwd(),
        '.vitest',
        'vitest-react-native-cache',
        'entries',
        `${process.pid}`,
        'packages',
      );

let nextNativeTag = 1;

function createMockNativeMethods() {
  return {
    blur: vi.fn(),
    focus: vi.fn(),
    measure: vi.fn(),
    measureInWindow: vi.fn(),
    measureLayout: vi.fn(),
    setNativeProps: vi.fn(),
  };
}

function createMockHostComponent(
  React: ReactModule,
  displayName: string,
  hostType: string,
  instanceMethods: Record<string, unknown> = {},
  realComponent?: any,
): any {
  const resolvedRealComponent = realComponent ?? null;
  const superClass =
    typeof resolvedRealComponent === 'function' &&
    (resolvedRealComponent.prototype instanceof React.Component ||
      resolvedRealComponent.prototype?.isReactComponent != null)
      ? resolvedRealComponent
      : React.Component;
  const resolvedName =
    resolvedRealComponent?.displayName ||
    resolvedRealComponent?.name ||
    resolvedRealComponent?.render?.displayName ||
    resolvedRealComponent?.render?.name ||
    displayName;
  const resolvedHostType = hostType || resolvedName.replace(/^(RCT|RK)/, '');

  class Component extends superClass {
    render(): ReactNode {
      const sourceProps = this.props as Record<string, unknown> & { children?: ReactNode };
      const props = {
        ...(resolvedRealComponent?.defaultProps ?? {}),
      } as Record<string, unknown> & { children?: ReactNode };

      Object.keys(sourceProps).forEach((propName) => {
        if (sourceProps[propName] !== undefined) {
          props[propName] = sourceProps[propName];
        }
      });

      return React.createElement(resolvedHostType, props as any, props.children);
    }
  }

  if (resolvedRealComponent != null) {
    Object.keys(resolvedRealComponent).forEach((classStatic) => {
      (Component as any)[classStatic] = resolvedRealComponent[classStatic];
    });
  }

  Object.assign(Component.prototype, instanceMethods);

  Object.defineProperty(Component, 'name', {
    configurable: true,
    enumerable: false,
    value: resolvedName,
    writable: false,
  });

  Object.defineProperty(Component, 'displayName', {
    configurable: true,
    enumerable: true,
    value: resolvedHostType,
    writable: true,
  });

  return Component;
}

function createMockNativeComponent(React: ReactModule, viewName: string): any {
  const hostName = viewName === 'RCTView' ? 'View' : viewName;

  class Component extends React.Component<Record<string, unknown>> {
    _nativeTag = nextNativeTag++;

    render(): ReactNode {
      const props = this.props as Record<string, unknown> & { children?: ReactNode };
      return React.createElement(hostName, props as any, props.children);
    }
  }

  Object.assign(Component.prototype, createMockNativeMethods());

  Object.defineProperty(Component, 'displayName', {
    configurable: true,
    enumerable: true,
    value: hostName,
    writable: true,
  });

  return Component;
}

function createAccessibilityInfoMockModule() {
  return {
    __esModule: true,
    default: {
      addEventListener: vi.fn(() => ({
        remove: vi.fn(),
      })),
      announceForAccessibility: vi.fn(),
      announceForAccessibilityWithOptions: vi.fn(),
      getRecommendedTimeoutMillis: vi.fn(() => Promise.resolve(false)),
      isAccessibilityServiceEnabled: vi.fn(() => Promise.resolve(false)),
      isBoldTextEnabled: vi.fn(() => Promise.resolve(false)),
      isDarkerSystemColorsEnabled: vi.fn(() => Promise.resolve(false)),
      isGrayscaleEnabled: vi.fn(() => Promise.resolve(false)),
      isHighTextContrastEnabled: vi.fn(() => Promise.resolve(false)),
      isInvertColorsEnabled: vi.fn(() => Promise.resolve(false)),
      isReduceMotionEnabled: vi.fn(() => Promise.resolve(false)),
      isReduceTransparencyEnabled: vi.fn(() => Promise.resolve(false)),
      isScreenReaderEnabled: vi.fn(() => Promise.resolve(false)),
      prefersCrossFadeTransitions: vi.fn(() => Promise.resolve(false)),
      sendAccessibilityEvent: vi.fn(),
      setAccessibilityFocus: vi.fn(),
    },
  };
}

function createClipboardMockModule() {
  return {
    __esModule: true,
    default: {
      getString: vi.fn(() => ''),
      setString: vi.fn(),
    },
  };
}

function createRefreshControlMockModule() {
  const React = runtimeRequire('react') as ReactModule;
  const RCTRefreshControl = createMockNativeComponent(React, 'RCTRefreshControl');

  class RefreshControlMock extends React.Component<Record<string, unknown>> {
    static latestRef: unknown;

    componentDidMount() {
      RefreshControlMock.latestRef = this;
    }

    render() {
      return React.createElement(RCTRefreshControl);
    }
  }

  return {
    __esModule: true,
    default: RefreshControlMock,
  };
}

function createActivityIndicatorMockModule() {
  const React = runtimeRequire('react') as ReactModule;
  return {
    __esModule: true,
    default: createMockHostComponent(React, 'ActivityIndicator', 'ActivityIndicator'),
  };
}

function createImageMockModule() {
  const React = runtimeRequire('react') as ReactModule;
  return {
    __esModule: true,
    default: createMockHostComponent(React, 'Image', 'Image'),
  };
}

function createTextMockModule() {
  const React = runtimeRequire('react') as ReactModule;
  return {
    __esModule: true,
    default: createMockHostComponent(React, 'Text', 'Text', createMockNativeMethods()),
  };
}

function createTextInputMockModule() {
  const React = runtimeRequire('react') as ReactModule;
  return {
    __esModule: true,
    default: createMockHostComponent(React, 'TextInput', 'TextInput', {
      ...createMockNativeMethods(),
      clear: vi.fn(),
      getNativeRef: vi.fn(function getNativeRef(this: unknown) {
        return this;
      }),
      isFocused: vi.fn(() => false),
    }),
  };
}

function createModalMockModule() {
  const React = runtimeRequire('react') as ReactModule;
  const BaseComponent = createMockHostComponent(React, 'Modal', 'Modal');

  class ModalMock extends BaseComponent {
    render(): ReactNode {
      const props = this.props as Record<string, unknown> & {
        children?: ReactNode;
        visible?: boolean;
      };

      if (props.visible === false) {
        return null;
      }

      return React.createElement(BaseComponent, props as any, props.children);
    }
  }

  Object.defineProperty(ModalMock, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'Modal',
    writable: true,
  });

  return {
    __esModule: true,
    default: ModalMock,
  };
}

function createViewMockModule() {
  const React = runtimeRequire('react') as ReactModule;
  return {
    __esModule: true,
    default: createMockHostComponent(React, 'View', 'View', createMockNativeMethods()),
  };
}

function createScrollViewMockModule(sharedView?: unknown) {
  const React = runtimeRequire('react') as ReactModule;
  const BaseComponent = createMockHostComponent(React, 'ScrollView', 'ScrollView', {
    ...createMockNativeMethods(),
    flashScrollIndicators: vi.fn(),
    getInnerViewNode: vi.fn(),
    getInnerViewRef: vi.fn(),
    getNativeScrollRef: vi.fn(),
    getScrollResponder: vi.fn(),
    getScrollableNode: vi.fn(),
    scrollResponderScrollNativeHandleToKeyboard: vi.fn(),
    scrollResponderZoomTo: vi.fn(),
    scrollTo: vi.fn(),
    scrollToEnd: vi.fn(),
  });
  const View = sharedView ?? createViewMockModule().default;
  const RCTScrollView = createMockNativeComponent(React, 'RCTScrollView');

  class ScrollViewMock extends BaseComponent {
    render(): ReactNode {
      const props = this.props as Record<string, unknown> & {
        children?: ReactNode;
        refreshControl?: ReactNode;
      };

      return React.createElement(
        RCTScrollView,
        props as any,
        props.refreshControl,
        React.createElement(View, null, props.children),
      );
    }
  }

  Object.defineProperty(ScrollViewMock, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'ScrollView',
    writable: true,
  });

  return {
    __esModule: true,
    default: ScrollViewMock,
  };
}

function createAppStateMockModule() {
  return {
    __esModule: true,
    default: {
      addEventListener: vi.fn(() => ({
        remove: vi.fn(),
      })),
      currentState: vi.fn(),
      removeEventListener: vi.fn(),
    },
  };
}

function createLinkingMockModule() {
  return {
    __esModule: true,
    default: {
      addEventListener: vi.fn(() => ({
        remove: vi.fn(),
      })),
      canOpenURL: vi.fn(() => Promise.resolve(true)),
      getInitialURL: vi.fn(() => Promise.resolve()),
      openSettings: vi.fn(),
      openURL: vi.fn(),
      sendIntent: vi.fn(),
    },
  };
}

function createVibrationMockModule() {
  return {
    __esModule: true,
    default: {
      cancel: vi.fn(),
      vibrate: vi.fn(),
    },
  };
}

function createViewNativeComponentMockModule() {
  const React = runtimeRequire('react') as ReactModule;
  return {
    __esModule: true,
    default: createMockHostComponent(React, 'View', 'View'),
  };
}

function createUseColorSchemeMockModule() {
  return {
    __esModule: true,
    default: vi.fn().mockReturnValue('light'),
  };
}

function createPlatformMockModule() {
  const platformConstants =
    runtimeGlobals.nativeModuleProxy?.PlatformConstants?.getConstants?.() ?? {
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
    };

  const platform = {
    OS: 'ios',
    select: <T,>(spec: { default?: T; ios?: T; native?: T }) =>
      'ios' in spec ? spec.ios : 'native' in spec ? spec.native : spec.default,
    get Version() {
      return platformConstants.osVersion;
    },
    get constants() {
      return platformConstants;
    },
    get isPad() {
      return platformConstants.interfaceIdiom === 'pad';
    },
    get isTV() {
      return platformConstants.interfaceIdiom === 'tv';
    },
    get isVision() {
      return platformConstants.interfaceIdiom === 'vision';
    },
    get isTesting() {
      return runtimeGlobals.__DEV__ ? platformConstants.isTesting : false;
    },
    get isDisableAnimations() {
      return platformConstants.isDisableAnimations ?? platform.isTesting;
    },
    get isMacCatalyst() {
      return platformConstants.isMacCatalyst ?? false;
    },
  };

  return {
    __esModule: true,
    default: platform,
  };
}

function createStyleSheetMockModule() {
  const styleSheet = {
    absoluteFill: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    absoluteFillObject: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    compose: vi.fn((left: unknown, right: unknown) => {
      if (left == null) {
        return right;
      }

      if (right == null) {
        return left;
      }

      return [left, right];
    }),
    create: vi.fn(<T extends Record<string, unknown>>(styles: T) => styles),
    flatten: vi.fn((style: unknown) => {
      if (!Array.isArray(style)) {
        return style ?? {};
      }

      return style.filter(Boolean).reduce<Record<string, unknown>>((accumulator, value) => {
        if (typeof value === 'object' && value != null && !Array.isArray(value)) {
          Object.assign(accumulator, value);
        }

        return accumulator;
      }, {});
    }),
    hairlineWidth: 1,
    setStyleAttributePreprocessor: vi.fn(),
  };

  return {
    __esModule: true,
    ...styleSheet,
    default: styleSheet,
  };
}

function createInitializeCoreMockModule() {
  return {
    __esModule: true,
    default: {},
  };
}

function createNativeExceptionsManagerMockModule() {
  const nativeExceptionsManager = {
    dismissRedbox: vi.fn(),
    reportException: vi.fn(),
    updateExceptionMessage: vi.fn(),
  };

  return {
    __esModule: true,
    default: nativeExceptionsManager,
    ...nativeExceptionsManager,
  };
}

function createRendererProxyMockModule() {
  const rendererProxy = {
    dispatchCommand: vi.fn(),
    findHostInstance_DEPRECATED: vi.fn((component: unknown) => component ?? null),
    findNodeHandle: vi.fn((component: { _nativeTag?: number } | null | undefined) => {
      if (component == null) {
        return null;
      }

      return component._nativeTag ?? 1;
    }),
    getNodeFromInternalInstanceHandle: vi.fn((handle: unknown) => handle ?? null),
    getPublicInstanceFromInternalInstanceHandle: vi.fn((handle: unknown) => handle ?? null),
    getPublicInstanceFromRootTag: vi.fn((rootTag: unknown) => rootTag ?? null),
    isChildPublicInstance: vi.fn(() => false),
    isProfilingRenderer: vi.fn(() => false),
    renderElement: vi.fn(),
    sendAccessibilityEvent: vi.fn(),
    unstable_batchedUpdates: vi.fn(<T>(callback: (...args: any[]) => T, ...args: any[]) =>
      callback(...args),
    ),
    unmountComponentAtNodeAndRemoveContainer: vi.fn(),
  };

  return {
    __esModule: true,
    ...rendererProxy,
    default: rendererProxy,
  };
}

function createUIManagerMockModule() {
  return {
    __esModule: true,
    default: runtimeGlobals.nativeModuleProxy?.UIManager ?? {},
  };
}

function createNativeModulesMockModule() {
  return {
    __esModule: true,
    default: runtimeGlobals.nativeModuleProxy ?? {},
  };
}

function createNativeComponentRegistryMockModule() {
  const registry = {
    get: vi.fn((name: string) =>
      createMockNativeComponent(runtimeRequire('react') as ReactModule, name),
    ),
    getWithFallback_DEPRECATED: vi.fn((name: string) =>
      createMockNativeComponent(runtimeRequire('react') as ReactModule, name),
    ),
    setRuntimeConfigProvider: vi.fn(),
    unstable_hasStaticViewConfig: vi.fn(() => false),
  };

  return {
    __esModule: true,
    ...registry,
    default: registry,
  };
}

function createRequireNativeComponentMockModule() {
  return {
    __esModule: true,
    default: vi.fn((name: string) =>
      createMockNativeComponent(runtimeRequire('react') as ReactModule, name),
    ),
  };
}

function createCodegenNativeComponentMockModule() {
  const codegenNativeComponent = vi.fn(
    (
      componentName: string,
      options?: {
        interfaceOnly?: boolean;
        paperComponentName?: string;
        paperComponentNameDeprecated?: string;
      },
    ) => {
      const { requireNativeComponentModule, uiManagerModule } = getSharedReactNativeMockModules();
      const requireNativeComponent =
        (requireNativeComponentModule as any).default ?? requireNativeComponentModule;
      const uiManager = (uiManagerModule as any).default ?? uiManagerModule;

      let componentNameInUse =
        options?.paperComponentName != null ? options.paperComponentName : componentName;

      if (
        options?.paperComponentNameDeprecated != null &&
        typeof uiManager?.hasViewManagerConfig === 'function'
      ) {
        if (uiManager.hasViewManagerConfig(componentName)) {
          componentNameInUse = componentName;
        } else if (uiManager.hasViewManagerConfig(options.paperComponentNameDeprecated)) {
          componentNameInUse = options.paperComponentNameDeprecated;
        }
      }

      return requireNativeComponent(componentNameInUse);
    },
  );

  return {
    __esModule: true,
    default: codegenNativeComponent,
  };
}

function createCodegenNativeCommandsMockModule() {
  const codegenNativeCommands = vi.fn(
    (options: {
      supportedCommands?: string[];
    }) => {
      const { rendererProxyModule } = getSharedReactNativeMockModules();
      const rendererProxy = (rendererProxyModule as any).default ?? rendererProxyModule;
      const commandObject: Record<string, ReturnType<typeof vi.fn>> = {};

      for (const command of options.supportedCommands ?? []) {
        commandObject[command] = vi.fn((ref: unknown, ...args: unknown[]) => {
          rendererProxy.dispatchCommand(ref, command, args);
        });
      }

      return commandObject;
    },
  );

  return {
    __esModule: true,
    default: codegenNativeCommands,
  };
}

type SharedReactNativeMockModules = {
  accessibilityInfoModule: ReturnType<typeof createAccessibilityInfoMockModule>;
  activityIndicatorModule: ReturnType<typeof createActivityIndicatorMockModule>;
  appStateModule: ReturnType<typeof createAppStateMockModule>;
  clipboardModule: ReturnType<typeof createClipboardMockModule>;
  codegenNativeCommandsModule: ReturnType<typeof createCodegenNativeCommandsMockModule>;
  codegenNativeComponentModule: ReturnType<typeof createCodegenNativeComponentMockModule>;
  imageModule: ReturnType<typeof createImageMockModule>;
  initializeCoreModule: ReturnType<typeof createInitializeCoreMockModule>;
  linkingModule: ReturnType<typeof createLinkingMockModule>;
  modalModule: ReturnType<typeof createModalMockModule>;
  nativeComponentRegistryModule: ReturnType<typeof createNativeComponentRegistryMockModule>;
  nativeExceptionsManagerModule: ReturnType<typeof createNativeExceptionsManagerMockModule>;
  nativeModulesModule: ReturnType<typeof createNativeModulesMockModule>;
  platformModule: ReturnType<typeof createPlatformMockModule>;
  refreshControlModule: ReturnType<typeof createRefreshControlMockModule>;
  rendererProxyModule: ReturnType<typeof createRendererProxyMockModule>;
  requireNativeComponentModule: ReturnType<typeof createRequireNativeComponentMockModule>;
  scrollViewModule: ReturnType<typeof createScrollViewMockModule>;
  styleSheetModule: ReturnType<typeof createStyleSheetMockModule>;
  textInputModule: ReturnType<typeof createTextInputMockModule>;
  textModule: ReturnType<typeof createTextMockModule>;
  uiManagerModule: ReturnType<typeof createUIManagerMockModule>;
  useColorSchemeModule: ReturnType<typeof createUseColorSchemeMockModule>;
  vibrationModule: ReturnType<typeof createVibrationMockModule>;
  viewModule: ReturnType<typeof createViewMockModule>;
  viewNativeComponentModule: ReturnType<typeof createViewNativeComponentMockModule>;
};

let sharedReactNativeMockModules: SharedReactNativeMockModules | null = null;
let sharedReactNativeExports: Record<string, unknown> | null = null;

// Yarn PnP: subpath mocks, the top-level facade, and the CJS loader patch
// must all reuse one registry so every caller observes the same RN instances.
function getSharedReactNativeMockModules() {
  if (sharedReactNativeMockModules != null) {
    return sharedReactNativeMockModules;
  }

  const viewModule = createViewMockModule();

  sharedReactNativeMockModules = {
    accessibilityInfoModule: createAccessibilityInfoMockModule(),
    activityIndicatorModule: createActivityIndicatorMockModule(),
    appStateModule: createAppStateMockModule(),
    clipboardModule: createClipboardMockModule(),
    codegenNativeCommandsModule: createCodegenNativeCommandsMockModule(),
    codegenNativeComponentModule: createCodegenNativeComponentMockModule(),
    imageModule: createImageMockModule(),
    initializeCoreModule: createInitializeCoreMockModule(),
    linkingModule: createLinkingMockModule(),
    modalModule: createModalMockModule(),
    nativeComponentRegistryModule: createNativeComponentRegistryMockModule(),
    nativeExceptionsManagerModule: createNativeExceptionsManagerMockModule(),
    nativeModulesModule: createNativeModulesMockModule(),
    platformModule: createPlatformMockModule(),
    refreshControlModule: createRefreshControlMockModule(),
    rendererProxyModule: createRendererProxyMockModule(),
    requireNativeComponentModule: createRequireNativeComponentMockModule(),
    scrollViewModule: createScrollViewMockModule((viewModule as any).default),
    styleSheetModule: createStyleSheetMockModule(),
    textInputModule: createTextInputMockModule(),
    textModule: createTextMockModule(),
    uiManagerModule: createUIManagerMockModule(),
    useColorSchemeModule: createUseColorSchemeMockModule(),
    vibrationModule: createVibrationMockModule(),
    viewModule,
    viewNativeComponentModule: createViewNativeComponentMockModule(),
  };

  return sharedReactNativeMockModules;
}

// Yarn PnP: Testing Library and app code can both reach `react-native`, so the
// top-level facade also has to be a singleton instead of rebuilding per import.
function getSharedReactNativeExports() {
  if (sharedReactNativeExports != null) {
    return sharedReactNativeExports;
  }

  const React = runtimeRequire('react') as ReactModule;
  const {
    accessibilityInfoModule,
    activityIndicatorModule,
    appStateModule,
    clipboardModule,
    codegenNativeCommandsModule,
    codegenNativeComponentModule,
    imageModule,
    linkingModule,
    modalModule,
    nativeComponentRegistryModule,
    nativeModulesModule,
    platformModule,
    refreshControlModule,
    rendererProxyModule,
    requireNativeComponentModule,
    scrollViewModule,
    styleSheetModule,
    textInputModule,
    textModule,
    uiManagerModule,
    useColorSchemeModule,
    vibrationModule,
    viewModule,
    viewNativeComponentModule,
  } = getSharedReactNativeMockModules();

  const initialDimensions =
    runtimeGlobals.nativeModuleProxy?.DeviceInfo?.getConstants?.().Dimensions ?? {
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
  let dimensionsState = initialDimensions;
  const dimensionListeners = new Set<(payload: typeof initialDimensions) => void>();
  const Dimensions = {
    addEventListener: vi.fn((type: string, handler: (payload: typeof initialDimensions) => void) => {
      if (type === 'change') {
        dimensionListeners.add(handler);
      }

      return {
        remove: () => dimensionListeners.delete(handler),
      };
    }),
    get: vi.fn((name: 'screen' | 'window') => dimensionsState[name]),
    set: vi.fn((nextDimensions: Partial<typeof initialDimensions>) => {
      dimensionsState = {
        ...dimensionsState,
        ...nextDimensions,
      };
      dimensionListeners.forEach((listener) => listener(dimensionsState));
    }),
  };
  const useWindowDimensions = () => Dimensions.get('window');
  const createEventEmitter = () => {
    const listeners = new Map<string, Set<(...args: any[]) => void>>();

    return {
      addListener: vi.fn((eventType: string, listener: (...args: any[]) => void) => {
        const eventListeners = listeners.get(eventType) ?? new Set();
        eventListeners.add(listener);
        listeners.set(eventType, eventListeners);

        return {
          remove: () => eventListeners.delete(listener),
        };
      }),
      emit: vi.fn((eventType: string, ...args: any[]) => {
        listeners.get(eventType)?.forEach((listener) => listener(...args));
      }),
      removeAllListeners: vi.fn((eventType?: string) => {
        if (eventType == null) {
          listeners.clear();
          return;
        }

        listeners.delete(eventType);
      }),
      listenerCount: vi.fn((eventType: string) => listeners.get(eventType)?.size ?? 0),
    };
  };
  const DeviceInfo = runtimeGlobals.nativeModuleProxy?.DeviceInfo ?? {
    getConstants: vi.fn(() => ({
      Dimensions: dimensionsState,
    })),
  };
  const DevSettings = {
    ...(runtimeGlobals.nativeModuleProxy?.DevSettings ?? {}),
    addMenuItem: vi.fn(),
    onFastRefresh: vi.fn(),
    reload: vi.fn(),
  };
  const i18nConstants =
    runtimeGlobals.nativeModuleProxy?.I18nManager?.getConstants?.() ?? {
      doLeftAndRightSwapInRTL: true,
      isRTL: false,
      localeIdentifier: 'en_US',
    };
  const I18nManager = {
    allowRTL: vi.fn((shouldAllow: boolean) =>
      runtimeGlobals.nativeModuleProxy?.I18nManager?.allowRTL?.(shouldAllow),
    ),
    doLeftAndRightSwapInRTL: i18nConstants.doLeftAndRightSwapInRTL,
    forceRTL: vi.fn((shouldForce: boolean) =>
      runtimeGlobals.nativeModuleProxy?.I18nManager?.forceRTL?.(shouldForce),
    ),
    getConstants: vi.fn(() => i18nConstants),
    isRTL: i18nConstants.isRTL,
    swapLeftAndRightInRTL: vi.fn((shouldSwap: boolean) =>
      runtimeGlobals.nativeModuleProxy?.I18nManager?.swapLeftAndRightInRTL?.(shouldSwap),
    ),
  };
  const PlatformColor = (...names: string[]) => ({ semantic: names });
  const processColor = vi.fn((color: unknown) => color);
  const turboModuleLookup = (name: string) =>
    runtimeGlobals.__turboModuleProxy?.(name) ?? runtimeGlobals.nativeModuleProxy?.[name] ?? null;
  const TurboModuleRegistry = {
    get: vi.fn((name: string) => turboModuleLookup(name)),
    getEnforcing: vi.fn((name: string) => {
      const module = turboModuleLookup(name);
      if (module == null) {
        throw new Error(`TurboModuleRegistry.getEnforcing(...): '${name}' could not be found.`);
      }
      return module;
    }),
  };
  const ActionSheetIOS = {
    dismissActionSheet: vi.fn(),
    showActionSheetWithOptions: vi.fn(
      (
        _options: Record<string, unknown>,
        callback: (buttonIndex: number) => void,
      ) => callback(0),
    ),
    showShareActionSheetWithOptions: vi.fn(
      (
        _options: Record<string, unknown>,
        _failureCallback: (error: unknown) => void,
        successCallback: (success: boolean, method: string | null) => void,
      ) => successCallback(true, null),
    ),
  };
  const Alert = {
    alert: vi.fn(),
    prompt: vi.fn(),
  };
  let appearanceColorScheme: 'light' | 'dark' | null = 'light';
  const appearanceListeners = new Set<(state: { colorScheme: 'light' | 'dark' | null }) => void>();
  const Appearance = {
    addChangeListener: vi.fn((listener: (state: { colorScheme: 'light' | 'dark' | null }) => void) => {
      appearanceListeners.add(listener);
      return {
        remove: () => appearanceListeners.delete(listener),
      };
    }),
    getColorScheme: vi.fn(() => appearanceColorScheme),
    setColorScheme: vi.fn((nextColorScheme: 'light' | 'dark' | null) => {
      appearanceColorScheme = nextColorScheme;
      appearanceListeners.forEach((listener) => listener({ colorScheme: appearanceColorScheme }));
    }),
  };
  const backPressSubscriptions = new Set<() => boolean | null | undefined>();
  const BackHandler = {
    addEventListener: vi.fn(
      (_eventName: string, handler: () => boolean | null | undefined) => {
        backPressSubscriptions.add(handler);
        return {
          remove: () => backPressSubscriptions.delete(handler),
        };
      },
    ),
    exitApp: vi.fn(),
  };
  const DeviceEventEmitter = createEventEmitter();
  const NativeAppEventEmitter = DeviceEventEmitter;
  const Keyboard = {
    ...createEventEmitter(),
    dismiss: vi.fn(),
    isVisible: vi.fn(() => false),
    metrics: vi.fn(() => null),
    scheduleLayoutAnimation: vi.fn(),
  };
  const PixelRatio = {
    get: vi.fn(() => Dimensions.get('window').scale),
    getFontScale: vi.fn(() => Dimensions.get('window').fontScale || Dimensions.get('window').scale),
    getPixelSizeForLayoutSize: vi.fn((layoutSize: number) =>
      Math.round(layoutSize * Dimensions.get('window').scale),
    ),
    roundToNearestPixel: vi.fn((layoutSize: number) => {
      const ratio = Dimensions.get('window').scale;
      return Math.round(layoutSize * ratio) / ratio;
    }),
    startDetecting: vi.fn(),
  };
  const settingsSubscriptions: Array<{ callback: Function | null; keys: string[] }> = [];
  const Settings = {
    _settings: {} as Record<string, unknown>,
    clearWatch: vi.fn((watchId: number) => {
      if (watchId < settingsSubscriptions.length) {
        settingsSubscriptions[watchId] = { callback: null, keys: [] };
      }
    }),
    get: vi.fn((key: string) => Settings._settings[key]),
    set: vi.fn((nextSettings: Record<string, unknown>) => {
      Settings._settings = {
        ...Settings._settings,
        ...nextSettings,
      };

      Object.keys(nextSettings).forEach((key) => {
        settingsSubscriptions.forEach((subscription) => {
          if (subscription.callback && subscription.keys.includes(key)) {
            subscription.callback();
          }
        });
      });
    }),
    watchKeys: vi.fn((keys: string | string[], callback: Function) => {
      const normalizedKeys = Array.isArray(keys) ? keys : [keys];
      const watchId = settingsSubscriptions.length;
      settingsSubscriptions.push({ callback, keys: normalizedKeys });
      return watchId;
    }),
  };
  const Share = {
    dismissedAction: 'dismissedAction',
    share: vi.fn(async () => ({
      action: 'sharedAction',
      activityType: null,
    })),
    sharedAction: 'sharedAction',
  };
  const callableModules =
    runtimeGlobals.__rntlCallableModules ?? {
      callable: {},
      lazy: {},
    };
  defineGlobalProperty(runtimeGlobals, '__rntlCallableModules', callableModules);
  const registerCallableModule = vi.fn(
    (
      name: string,
      moduleOrFactory: Record<string, unknown> | (() => Record<string, unknown>),
    ) => {
      if (
        runtimeGlobals.RN$Bridgeless === true &&
        typeof runtimeGlobals.RN$registerCallableModule === 'function'
      ) {
        if (typeof moduleOrFactory === 'function') {
          runtimeGlobals.RN$registerCallableModule(name, moduleOrFactory);
          return;
        }

        runtimeGlobals.RN$registerCallableModule(name, () => moduleOrFactory);
        return;
      }

      if (typeof moduleOrFactory === 'function') {
        callableModules.lazy[name] = moduleOrFactory;
        delete callableModules.callable[name];
        return;
      }

      callableModules.callable[name] = moduleOrFactory;
      delete callableModules.lazy[name];
    },
  );
  const Button = ({
    accessibilityState,
    disabled,
    title,
    ...props
  }: Record<string, unknown> & {
    accessibilityState?: Record<string, unknown>;
    disabled?: boolean;
    title: string;
  }) =>
    React.createElement(
      'View',
      {
        ...props,
        accessibilityRole: 'button',
        accessibilityState: {
          ...(accessibilityState ?? {}),
          disabled: Boolean(disabled),
        },
        accessible: props.accessible ?? true,
      } as any,
      React.createElement(
        'Text',
        null,
        (platformModule as any).default?.OS === 'android' ? title.toUpperCase() : title,
      ),
    );
  Button.displayName = 'Button';
  class DrawerLayoutAndroid extends React.Component<Record<string, unknown>> {
    closeDrawer = vi.fn();
    openDrawer = vi.fn();

    render(): ReactNode {
      const props = this.props as Record<string, unknown> & { children?: ReactNode };
      return React.createElement('AndroidDrawerLayout', props as any, props.children);
    }
  }
  Object.assign(DrawerLayoutAndroid.prototype, createMockNativeMethods());
  Object.defineProperty(DrawerLayoutAndroid, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'DrawerLayoutAndroid',
    writable: true,
  });
  const createListSeparators = () => ({
    highlight: vi.fn(),
    unhighlight: vi.fn(),
    updateProps: vi.fn(),
  });
  const getItemKey = (item: any, index: number, keyExtractor?: (item: any, index: number) => string) =>
    keyExtractor?.(item, index) ?? item?.key ?? String(index);
  class FlatList extends React.PureComponent<Record<string, unknown>> {
    flashScrollIndicators = vi.fn();
    getNativeScrollRef = vi.fn(() => this.scrollViewRef);
    getScrollResponder = vi.fn(() => this.scrollViewRef);
    getScrollableNode = vi.fn(() => this.scrollViewRef);
    recordInteraction = vi.fn();
    scrollToEnd = vi.fn();
    scrollToIndex = vi.fn();
    scrollToItem = vi.fn();
    scrollToOffset = vi.fn();
    setNativeProps = vi.fn();
    private scrollViewRef: unknown = null;

    private setScrollViewRef = (ref: unknown) => {
      this.scrollViewRef = ref;
    };

    render(): ReactNode {
      const { data, keyExtractor, renderItem, ...props } = this.props as Record<string, unknown> & {
        data?: any[];
        keyExtractor?: (item: any, index: number) => string;
        renderItem?: (info: { item: any; index: number; separators: ReturnType<typeof createListSeparators> }) => ReactNode;
      };
      const ScrollViewComponent = (scrollViewModule as any).default ?? scrollViewModule;
      const items = Array.isArray(data) ? data : [];

      return React.createElement(
        ScrollViewComponent,
        { ...(props as any), ref: this.setScrollViewRef },
        items.map((item, index) =>
          React.createElement(
            React.Fragment,
            { key: getItemKey(item, index, keyExtractor) },
            renderItem?.({
              index,
              item,
              separators: createListSeparators(),
            }),
          ),
        ),
      );
    }
  }
  Object.defineProperty(FlatList, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'FlatList',
    writable: true,
  });
  class VirtualizedList extends React.PureComponent<Record<string, unknown>> {
    flashScrollIndicators = vi.fn();
    getNativeScrollRef = vi.fn(() => this.scrollViewRef);
    getScrollResponder = vi.fn(() => this.scrollViewRef);
    getScrollableNode = vi.fn(() => this.scrollViewRef);
    recordInteraction = vi.fn();
    scrollToEnd = vi.fn();
    scrollToIndex = vi.fn();
    scrollToOffset = vi.fn();
    setNativeProps = vi.fn();
    private scrollViewRef: unknown = null;

    private setScrollViewRef = (ref: unknown) => {
      this.scrollViewRef = ref;
    };

    render(): ReactNode {
      const {
        data,
        getItem,
        getItemCount,
        renderItem,
        ...props
      } = this.props as Record<string, unknown> & {
        data?: unknown;
        getItem?: (data: unknown, index: number) => any;
        getItemCount?: (data: unknown) => number;
        renderItem?: (info: {
          index: number;
          item: any;
          separators: ReturnType<typeof createListSeparators>;
        }) => ReactNode;
      };
      const ScrollViewComponent = (scrollViewModule as any).default ?? scrollViewModule;
      const itemCount = getItemCount?.(data) ?? 0;

      return React.createElement(
        ScrollViewComponent,
        { ...(props as any), ref: this.setScrollViewRef },
        Array.from({ length: itemCount }, (_, index) => {
          const item = getItem?.(data, index);

          return React.createElement(
            React.Fragment,
            { key: getItemKey(item, index) },
            renderItem?.({
              index,
              item,
              separators: createListSeparators(),
            }),
          );
        }),
      );
    }
  }
  Object.defineProperty(VirtualizedList, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'VirtualizedList',
    writable: true,
  });
  class ImageBackground extends React.Component<Record<string, unknown>> {
    private viewRef: { setNativeProps?: (props: Record<string, unknown>) => void } | null = null;

    setNativeProps = vi.fn((props: Record<string, unknown>) => {
      this.viewRef?.setNativeProps?.(props);
    });

    private captureViewRef = (
      ref: { setNativeProps?: (props: Record<string, unknown>) => void } | null,
    ) => {
      this.viewRef = ref;
    };

    render(): ReactNode {
      const { children, imageRef, imageStyle, style, ...props } = this.props as Record<string, unknown> & {
        children?: ReactNode;
        imageRef?: unknown;
        imageStyle?: unknown;
      };
      const ViewComponent = (viewModule as any).default ?? viewModule;
      const ImageComponent = (imageModule as any).default ?? imageModule;

      return React.createElement(
        ViewComponent,
        {
          accessibilityIgnoresInvertColors: true,
          ref: this.captureViewRef,
          style,
        } as any,
        React.createElement(ImageComponent, {
          ...(props as any),
          ref: imageRef,
          style: imageStyle,
        }),
        children,
      );
    }
  }
  Object.defineProperty(ImageBackground, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'ImageBackground',
    writable: true,
  });
  const InputAccessoryView = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: ReactNode }) => {
    if (React.Children.count(children) === 0) {
      return null;
    }

    return React.createElement('InputAccessoryView', props as any, children);
  };
  InputAccessoryView.displayName = 'InputAccessoryView';
  const LayoutConformance = createMockHostComponent(
    React,
    'LayoutConformance',
    'LayoutConformance',
  );
  const KeyboardAvoidingView = createMockHostComponent(
    React,
    'KeyboardAvoidingView',
    'KeyboardAvoidingView',
    createMockNativeMethods(),
  );
  const ProgressBarAndroid = createMockHostComponent(
    React,
    'ProgressBarAndroid',
    'ProgressBarAndroid',
  );
  class StatusBar extends React.Component<Record<string, unknown>> {
    static currentHeight =
      runtimeGlobals.nativeModuleProxy?.StatusBarManager?.getConstants?.().HEIGHT ?? 0;
    static setBackgroundColor = vi.fn((color: string, animated?: boolean) =>
      runtimeGlobals.nativeModuleProxy?.StatusBarManager?.setBackgroundColor?.(color, animated),
    );
    static setBarStyle = vi.fn((style: string, animated?: boolean) =>
      runtimeGlobals.nativeModuleProxy?.StatusBarManager?.setStyle?.(style, animated),
    );
    static setHidden = vi.fn((hidden: boolean, animation?: string) =>
      runtimeGlobals.nativeModuleProxy?.StatusBarManager?.setHidden?.(hidden, animation),
    );
    static setNetworkActivityIndicatorVisible = vi.fn((visible: boolean) =>
      runtimeGlobals.nativeModuleProxy?.StatusBarManager?.setNetworkActivityIndicatorVisible?.(
        visible,
      ),
    );
    static setTranslucent = vi.fn((translucent: boolean) =>
      runtimeGlobals.nativeModuleProxy?.StatusBarManager?.setTranslucent?.(translucent),
    );

    render() {
      return null;
    }
  }
  Object.defineProperty(StatusBar, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'StatusBar',
    writable: true,
  });
  const Switch = createMockHostComponent(React, 'Switch', 'Switch', createMockNativeMethods());
  const createTouchableComponent = (displayName: string) => {
    class TouchableComponent extends React.Component<Record<string, unknown>> {
      render() {
        const props = {
          ...this.props,
          accessible: (this.props as Record<string, unknown>).accessible ?? true,
        };

        return React.createElement('View', props as any, (props as any).children);
      }
    }

    Object.assign(TouchableComponent.prototype, createMockNativeMethods());
    Object.defineProperty(TouchableComponent, 'displayName', {
      configurable: true,
      enumerable: true,
      value: displayName,
      writable: true,
    });

    return TouchableComponent;
  };
  const Touchable = createTouchableComponent('Touchable');
  const TouchableHighlight = createTouchableComponent('TouchableHighlight');
  const TouchableNativeFeedback = createTouchableComponent('TouchableNativeFeedback');
  const TouchableOpacity = createTouchableComponent('TouchableOpacity');
  const TouchableWithoutFeedback = createTouchableComponent('TouchableWithoutFeedback');
  const appRegistryRunnables: Record<string, (...args: any[]) => void> = {};
  const appRegistrySections: Record<string, (...args: any[]) => void> = {};
  const AppRegistry = {
    getAppKeys: vi.fn(() => Object.keys(appRegistryRunnables)),
    getRegistry: vi.fn(() => ({
      runnables: { ...appRegistryRunnables },
      sections: Object.keys(appRegistrySections),
    })),
    getRunnable: vi.fn((appKey: string) => appRegistryRunnables[appKey]),
    getSectionKeys: vi.fn(() => Object.keys(appRegistrySections)),
    getSections: vi.fn(() => ({ ...appRegistrySections })),
    registerComponent: vi.fn((appKey: string, componentProvider: () => unknown, section?: boolean) => {
      const runnable = vi.fn(() => componentProvider());
      appRegistryRunnables[appKey] = runnable;
      if (section) {
        appRegistrySections[appKey] = runnable;
      }
      return appKey;
    }),
    registerConfig: vi.fn((configs: Array<Record<string, unknown>>) => {
      configs.forEach((config) => {
        if (typeof config.run === 'function' && typeof config.appKey === 'string') {
          AppRegistry.registerRunnable(config.appKey, config.run as (...args: any[]) => void);
          return;
        }

        if (typeof config.appKey === 'string' && typeof config.component === 'function') {
          AppRegistry.registerComponent(
            config.appKey,
            config.component as () => unknown,
            Boolean(config.section),
          );
        }
      });
    }),
    registerRunnable: vi.fn((appKey: string, run: (...args: any[]) => void) => {
      appRegistryRunnables[appKey] = run;
      return appKey;
    }),
    registerSection: vi.fn((appKey: string, componentProvider: () => unknown) => {
      AppRegistry.registerComponent(appKey, componentProvider, true);
    }),
    setRootViewStyleProvider: vi.fn(),
    setWrapperComponentProvider: vi.fn(),
  };
  const Easing = {
    back: vi.fn((s: number = 1.70158) => (t: number) => t * t * ((s + 1) * t - s)),
    bezier: vi.fn(() => (t: number) => t),
    bounce: vi.fn((t: number) => t * t),
    circle: vi.fn((t: number) => 1 - Math.sqrt(1 - t * t)),
    cubic: vi.fn((t: number) => t * t * t),
    ease: vi.fn((t: number) => t * t * (3 - 2 * t)),
    elastic: vi.fn((bounciness: number = 1) => (t: number) =>
      1 - Math.pow(Math.cos((t * Math.PI) / 2), 3) * Math.cos(t * bounciness * Math.PI),
    ),
    exp: vi.fn((t: number) => Math.pow(2, 10 * (t - 1))),
    in: vi.fn((easing: (t: number) => number) => (t: number) => easing(t)),
    inOut: vi.fn(
      (easing: (t: number) => number) => (t: number) =>
        t < 0.5 ? easing(t * 2) / 2 : 1 - easing((1 - t) * 2) / 2,
    ),
    linear: vi.fn((t: number) => t),
    out: vi.fn((easing: (t: number) => number) => (t: number) => 1 - easing(1 - t)),
    poly: vi.fn((n: number) => (t: number) => Math.pow(t, n)),
    quad: vi.fn((t: number) => t * t),
    sin: vi.fn((t: number) => 1 - Math.cos((t * Math.PI) / 2)),
    step0: vi.fn((n: number) => (n > 0 ? 1 : 0)),
    step1: vi.fn((n: number) => (n >= 1 ? 1 : 0)),
  };
  const interactionEventEmitter = createEventEmitter();
  let nextInteractionHandle = 1;
  const InteractionManager = {
    Events: {
      interactionComplete: 'interactionComplete',
      interactionStart: 'interactionStart',
    },
    addListener: interactionEventEmitter.addListener,
    clearInteractionHandle: vi.fn(() => undefined),
    createInteractionHandle: vi.fn(() => nextInteractionHandle++),
    runAfterInteractions: vi.fn((task?: (() => void) | { run?: () => void }) => {
      let cancelled = false;
      const promise = Promise.resolve().then(() => {
        if (cancelled) {
          return undefined;
        }

        if (typeof task === 'function') {
          task();
          return undefined;
        }

        task?.run?.();
        return undefined;
      });

      return {
        cancel: () => {
          cancelled = true;
        },
        then: promise.then.bind(promise),
      };
    }),
    setDeadline: vi.fn(),
  };
  let layoutAnimationEnabled = true;
  const layoutAnimationTypes = {
    easeInEaseOut: 'easeInEaseOut',
    easeIn: 'easeIn',
    easeOut: 'easeOut',
    keyboard: 'keyboard',
    linear: 'linear',
    spring: 'spring',
  };
  const layoutAnimationProperties = {
    opacity: 'opacity',
    scaleX: 'scaleX',
    scaleXY: 'scaleXY',
    scaleY: 'scaleY',
  };
  const createLayoutAnimationConfig = (
    duration: number,
    type?: string,
    property?: string,
  ) => ({
    create: { property, type },
    delete: { property, type },
    duration,
    update: { type },
  });
  const layoutAnimationPresets = {
    easeInEaseOut: createLayoutAnimationConfig(300, 'easeInEaseOut', 'opacity'),
    linear: createLayoutAnimationConfig(500, 'linear', 'opacity'),
    spring: {
      create: {
        property: 'opacity',
        type: 'linear',
      },
      delete: {
        property: 'opacity',
        type: 'linear',
      },
      duration: 700,
      update: {
        springDamping: 0.4,
        type: 'spring',
      },
    },
  };
  const LayoutAnimation = {
    Properties: layoutAnimationProperties,
    Presets: layoutAnimationPresets,
    Types: layoutAnimationTypes,
    checkConfig: vi.fn(),
    configureNext: vi.fn(
      (
        _config: Record<string, unknown>,
        onAnimationDidEnd?: () => void,
        _onAnimationDidFail?: () => void,
      ) => {
        if (layoutAnimationEnabled) {
          onAnimationDidEnd?.();
        }
      },
    ),
    create: vi.fn(createLayoutAnimationConfig),
    easeInEaseOut: vi.fn((onAnimationDidEnd?: () => void) =>
      LayoutAnimation.configureNext(layoutAnimationPresets.easeInEaseOut, onAnimationDidEnd),
    ),
    linear: vi.fn((onAnimationDidEnd?: () => void) =>
      LayoutAnimation.configureNext(layoutAnimationPresets.linear, onAnimationDidEnd),
    ),
    setEnabled: vi.fn((value: boolean) => {
      layoutAnimationEnabled = value;
    }),
    spring: vi.fn((onAnimationDidEnd?: () => void) =>
      LayoutAnimation.configureNext(layoutAnimationPresets.spring, onAnimationDidEnd),
    ),
  };
  const NativeDialogManagerAndroid = {
    getConstants: vi.fn(() => ({
      buttonClicked: 'buttonClicked',
      buttonNegative: 'buttonNegative',
      buttonNeutral: 'buttonNeutral',
      buttonPositive: 'buttonPositive',
      dismissed: 'dismissed',
    })),
    showAlert: vi.fn(
      (
        _config: Record<string, unknown>,
        _onError: (message: string) => void,
        onAction: (action: string, buttonKey: string) => void,
      ) => onAction('buttonClicked', 'buttonPositive'),
    ),
  };
  const networkingEventEmitter = createEventEmitter();
  const Networking = {
    abortRequest: vi.fn(),
    addListener: networkingEventEmitter.addListener,
    clearCookies: vi.fn((callback: (result: boolean) => void) => callback(true)),
    sendRequest: vi.fn(
      (
        _method: string,
        _trackingName: string | null,
        _url: string,
        _headers: Record<string, string>,
        _data: unknown,
        _responseType: string,
        _incrementalUpdates: boolean,
        _timeout: number,
        callback: (requestId: number) => void,
      ) => callback(1),
    ),
  };
  const permissionsResults = {
    DENIED: 'denied',
    GRANTED: 'granted',
    NEVER_ASK_AGAIN: 'never_ask_again',
  };
  const permissions = {
    CAMERA: 'android.permission.CAMERA',
  };
  const PermissionsAndroid = {
    PERMISSIONS: permissions,
    RESULTS: permissionsResults,
    check: vi.fn(async () => true),
    request: vi.fn(async () => permissionsResults.GRANTED),
    requestMultiple: vi.fn(async (requestedPermissions: string[]) =>
      Object.fromEntries(requestedPermissions.map((permission) => [permission, permissionsResults.GRANTED])),
    ),
    shouldShowRequestPermissionRationale: vi.fn(async () => false),
  };
  const ToastAndroid = {
    BOTTOM: 80,
    CENTER: 17,
    LONG: 1,
    SHORT: 0,
    TOP: 49,
    show: vi.fn(),
    showWithGravity: vi.fn(),
    showWithGravityAndOffset: vi.fn(),
  };
  const DevMenu = {
    show: vi.fn(),
  };
  const LogBox = {
    ignoreAllLogs: vi.fn(),
    ignoreLogs: vi.fn(),
    install: vi.fn(),
    uninstall: vi.fn(),
  };
  class NativeEventEmitter {
    private nativeModule?: {
      addListener?: (eventType: string) => void;
      removeListeners?: (count: number) => void;
    };

    constructor(
      nativeModule?: {
        addListener?: (eventType: string) => void;
        removeListeners?: (count: number) => void;
      },
    ) {
      if ((platformModule as any).default?.OS === 'ios' && nativeModule == null) {
        throw new Error('NativeEventEmitter requires a non-null argument.');
      }

      if (
        nativeModule &&
        typeof nativeModule.addListener === 'function' &&
        typeof nativeModule.removeListeners === 'function'
      ) {
        this.nativeModule = nativeModule;
      }
    }

    addListener(eventType: string, listener: (...args: any[]) => void) {
      this.nativeModule?.addListener?.(eventType);
      let subscription = DeviceEventEmitter.addListener(eventType, listener);

      return {
        remove: () => {
          if (subscription != null) {
            this.nativeModule?.removeListeners?.(1);
            subscription.remove();
            subscription = null as any;
          }
        },
      };
    }

    emit(eventType: string, ...args: any[]) {
      DeviceEventEmitter.emit(eventType, ...args);
    }

    removeAllListeners(eventType?: string) {
      if (eventType == null) {
        throw new Error('NativeEventEmitter.removeAllListeners requires a non-null argument.');
      }

      this.nativeModule?.removeListeners?.(DeviceEventEmitter.listenerCount(eventType));
      DeviceEventEmitter.removeAllListeners(eventType);
    }

    listenerCount(eventType: string) {
      return DeviceEventEmitter.listenerCount(eventType);
    }
  }
  const PanResponder = {
    create: vi.fn((callbacks: Record<string, (...args: any[]) => unknown> = {}) => {
      const gestureState = {
        _accountsForMovesUpTo: 0,
        dx: 0,
        dy: 0,
        moveX: 0,
        moveY: 0,
        numberActiveTouches: 0,
        stateID: 0,
        vx: 0,
        vy: 0,
        x0: 0,
        y0: 0,
      };

      return {
        getInteractionHandle: vi.fn(() => null),
        panHandlers: {
          onMoveShouldSetResponder: (...args: any[]) =>
            callbacks.onMoveShouldSetPanResponder?.(...args, gestureState) ?? false,
          onMoveShouldSetResponderCapture: (...args: any[]) =>
            callbacks.onMoveShouldSetPanResponderCapture?.(...args, gestureState) ?? false,
          onResponderEnd: (...args: any[]) => callbacks.onPanResponderEnd?.(...args, gestureState),
          onResponderGrant: (...args: any[]) =>
            callbacks.onPanResponderGrant?.(...args, gestureState) ?? false,
          onResponderMove: (...args: any[]) => callbacks.onPanResponderMove?.(...args, gestureState),
          onResponderReject: (...args: any[]) =>
            callbacks.onPanResponderReject?.(...args, gestureState),
          onResponderRelease: (...args: any[]) =>
            callbacks.onPanResponderRelease?.(...args, gestureState),
          onResponderStart: (...args: any[]) => callbacks.onPanResponderStart?.(...args, gestureState),
          onResponderTerminate: (...args: any[]) =>
            callbacks.onPanResponderTerminate?.(...args, gestureState),
          onResponderTerminationRequest: (...args: any[]) =>
            callbacks.onPanResponderTerminationRequest?.(...args, gestureState) ?? true,
          onStartShouldSetResponder: (...args: any[]) =>
            callbacks.onStartShouldSetPanResponder?.(...args, gestureState) ?? false,
          onStartShouldSetResponderCapture: (...args: any[]) =>
            callbacks.onStartShouldSetPanResponderCapture?.(...args, gestureState) ?? false,
        },
      };
    }),
  };
  const pushNotificationManager = runtimeGlobals.nativeModuleProxy?.PushNotificationManager;
  const PushNotificationIOS = {
    abandonPermissions: vi.fn(() => pushNotificationManager?.abandonPermissions?.()),
    addEventListener: vi.fn(),
    getApplicationIconBadgeNumber: vi.fn((callback: (badge: number) => void) =>
      pushNotificationManager?.getApplicationIconBadgeNumber?.(callback),
    ),
    presentLocalNotification: vi.fn((notification: Record<string, unknown>) =>
      pushNotificationManager?.presentLocalNotification?.(notification),
    ),
    removeAllDeliveredNotifications: vi.fn(() =>
      pushNotificationManager?.removeAllDeliveredNotifications?.(),
    ),
    removeEventListener: vi.fn(),
    requestPermissions: vi.fn(() => pushNotificationManager?.requestPermissions?.()),
  };
  let systraceEnabled = false;
  let systraceCookie = 0;
  const Systrace = {
    beginAsyncEvent: vi.fn(() => systraceCookie++),
    beginEvent: vi.fn(),
    counterEvent: vi.fn(),
    endAsyncEvent: vi.fn(),
    endEvent: vi.fn(),
    isEnabled: vi.fn(() => systraceEnabled),
    setEnabled: vi.fn((enabled: boolean) => {
      systraceEnabled = enabled;
    }),
  };
  const UTFSequence = Object.freeze({
    BOM: '\ufeff',
    BULLET: '\u2022',
    BULLET_SP: '\u00A0\u2022\u00A0',
    MDASH: '\u2014',
    MDASH_SP: '\u00A0\u2014\u00A0',
    MIDDOT: '\u00B7',
    MIDDOT_KATAKANA: '\u30FB',
    MIDDOT_SP: '\u00A0\u00B7\u00A0',
    NBSP: '\u00A0',
    NDASH: '\u2013',
    NDASH_SP: '\u00A0\u2013\u00A0',
    NEWLINE: '\u000A',
    PIZZA: '\uD83C\uDF55',
    TRIANGLE_LEFT: '\u25c0',
    TRIANGLE_RIGHT: '\u25b6',
  });
  const DynamicColorIOS = vi.fn(() => {
    throw new Error('DynamicColorIOS is not available on this platform.');
  });
  class SectionList extends React.PureComponent<Record<string, unknown>> {
    flashScrollIndicators = vi.fn();
    getScrollResponder = vi.fn(() => this.scrollViewRef);
    getScrollableNode = vi.fn(() => this.scrollViewRef);
    recordInteraction = vi.fn();
    scrollToLocation = vi.fn();
    setNativeProps = vi.fn();
    private scrollViewRef: unknown = null;

    private setScrollViewRef = (ref: unknown) => {
      this.scrollViewRef = ref;
    };

    render(): ReactNode {
      const {
        renderItem,
        renderSectionHeader,
        sections,
        ...props
      } = this.props as Record<string, unknown> & {
        renderItem?: (info: { index: number; item: any; section: Record<string, unknown>; separators: ReturnType<typeof createListSeparators> }) => ReactNode;
        renderSectionHeader?: (info: { section: Record<string, unknown> }) => ReactNode;
        sections?: Array<Record<string, unknown> & { data?: any[] }>;
      };
      const ScrollViewComponent = (scrollViewModule as any).default ?? scrollViewModule;

      return React.createElement(
        ScrollViewComponent,
        { ...(props as any), ref: this.setScrollViewRef },
        (sections ?? []).map((section, sectionIndex) =>
          React.createElement(
            React.Fragment,
            { key: String(section.key ?? section.title ?? sectionIndex) },
            renderSectionHeader?.({ section }),
            (section.data ?? []).map((item, itemIndex) =>
              React.createElement(
                React.Fragment,
                {
                  key: getItemKey(item, itemIndex, section.keyExtractor as any),
                },
                renderItem?.({
                  index: itemIndex,
                  item,
                  section,
                  separators: createListSeparators(),
                }),
              ),
            ),
          ),
        ),
      );
    }
  }
  Object.defineProperty(SectionList, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'SectionList',
    writable: true,
  });
  class VirtualizedSectionList extends SectionList {}
  Object.defineProperty(VirtualizedSectionList, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'VirtualizedSectionList',
    writable: true,
  });
  const RootTagContext = React.createContext(0);
  RootTagContext.displayName = 'RootTagContext';
  const TextAncestorContext = React.createContext(false);
  TextAncestorContext.displayName = 'TextAncestorContext';

  const sharedNativeMethods = createMockNativeMethods();
  const NativeText = createMockNativeComponent(React, 'RCTText');
  const SafeAreaView = createMockHostComponent(React, 'SafeAreaView', 'View', sharedNativeMethods);
  const VirtualView = createMockHostComponent(
    React,
    'VirtualView',
    'VirtualView',
    sharedNativeMethods,
  );
  const VirtualViewMode = Object.freeze({
    Hidden: 2,
    Prerender: 1,
    Visible: 0,
  });
  class Pressable extends React.Component<Record<string, unknown>> {
    render() {
      const props = {
        ...this.props,
        accessible: (this.props as Record<string, unknown>).accessible ?? true,
      };

      return React.createElement('View', props as any, (props as any).children);
    }
  }
  Object.assign(Pressable.prototype, sharedNativeMethods);
  Object.defineProperty(Pressable, 'displayName', {
    configurable: true,
    enumerable: true,
    value: 'Pressable',
    writable: true,
  });

  class AnimatedNode {
    private listeners = new Set<(value: number) => void>();
    protected value: any;

    constructor(initialValue: any) {
      this.value = initialValue;
    }

    __getValue() {
      return this.value;
    }

    addListener(listener: (state: { value: number }) => void) {
      const wrapped = (value: number) => listener({ value });
      this.listeners.add(wrapped);
      return {
        remove: () => this.listeners.delete(wrapped),
      };
    }

    removeAllListeners() {
      this.listeners.clear();
    }

    protected emitValue(nextValue: any) {
      this.value = nextValue;
      this.listeners.forEach((listener) => listener(nextValue));
    }
  }

  class AnimatedValue extends AnimatedNode {
    setValue(nextValue: number) {
      this.emitValue(nextValue);
    }
  }

  class AnimatedValueXY extends AnimatedNode {
    x: AnimatedValue;
    y: AnimatedValue;

    constructor(initialValue: { x: number; y: number }) {
      super(initialValue);
      this.x = new AnimatedValue(initialValue.x);
      this.y = new AnimatedValue(initialValue.y);
    }

    setValue(nextValue: { x: number; y: number }) {
      this.x.setValue(nextValue.x);
      this.y.setValue(nextValue.y);
      this.emitValue({ x: nextValue.x, y: nextValue.y });
    }
  }

  class AnimatedInterpolation extends AnimatedNode {}

  class AnimatedColor extends AnimatedNode {}

  const createAnimatedNode = (initialValue: any) => new AnimatedNode(initialValue);

  const toAnimatedValue = (value: unknown) =>
    value instanceof AnimatedNode ? value.__getValue() : value;

  const createAnimation = (
    startImpl: (callback?: (result: { finished: boolean }) => void) => void,
  ) => ({
    reset: vi.fn(),
    start: (callback?: (result: { finished: boolean }) => void) => {
      startImpl(callback);
    },
    stop: vi.fn(),
  });

  const runValueAnimation = (
    value: AnimatedValue,
    nextValue: number,
    duration: number | undefined,
    callback?: (result: { finished: boolean }) => void,
  ) => {
    setTimeout(() => {
      value.setValue(nextValue);
      callback?.({ finished: true });
    }, duration ?? 0);
  };

  function resolveAnimatedStyle(style: unknown): unknown {
    if (style instanceof AnimatedNode) {
      return style.__getValue();
    }

    if (Array.isArray(style)) {
      return style.map((value) => resolveAnimatedStyle(value));
    }

    if (style && typeof style === 'object') {
      return Object.fromEntries(
        Object.entries(style).map(([key, value]) => [key, resolveAnimatedStyle(value)]),
      );
    }

    return style;
  }

  class AnimatedView extends React.Component<Record<string, unknown>> {
    private subscriptions: Array<{ remove: () => void }> = [];

    componentDidMount() {
      this.subscribe(this.props.style);
    }

    componentDidUpdate(previousProps: Record<string, unknown>) {
      if (previousProps.style !== this.props.style) {
        this.unsubscribe();
        this.subscribe(this.props.style);
      }
    }

    componentWillUnmount() {
      this.unsubscribe();
    }

    private forceAnimatedUpdate = () => {
      this.setState((state) => ({ ...(state ?? {}), animatedTick: Date.now() }));
    };

    private subscribe(style: unknown) {
      const queue = [style];

      while (queue.length > 0) {
        const current = queue.shift();

        if (current instanceof AnimatedNode) {
          this.subscriptions.push(current.addListener(this.forceAnimatedUpdate));
          continue;
        }

        if (Array.isArray(current)) {
          queue.push(...current);
          continue;
        }

        if (current && typeof current === 'object') {
          queue.push(...Object.values(current));
        }
      }
    }

    private unsubscribe() {
      this.subscriptions.forEach((subscription) => subscription.remove());
      this.subscriptions = [];
    }

    render() {
      const resolvedStyle = resolveAnimatedStyle(this.props.style);

      return React.createElement(
        'View',
        { ...(this.props as any), style: resolvedStyle },
        (this.props as any).children,
      );
    }
  }

  class AnimatedEvent {
    __isNative: boolean;
    handler: (...args: any[]) => void;

    constructor(
      _argMapping: unknown[],
      config?: {
        listener?: (...args: any[]) => void;
        useNativeDriver?: boolean;
      },
    ) {
      this.__isNative = Boolean(config?.useNativeDriver);
      this.handler = (...args: any[]) => {
        config?.listener?.(...args);
      };
    }
  }

  const createAnimatedComputation = (value: unknown) => createAnimatedNode(value);
  const createCombinedHandler = (
    baseHandler: ((...args: any[]) => void) | undefined,
    nextHandler: ((...args: any[]) => void) | undefined,
  ) =>
    Object.assign(
      (...args: any[]) => {
        baseHandler?.(...args);
        nextHandler?.(...args);
      },
      {
        __rntlBaseHandler: baseHandler,
        __rntlExtraHandler: nextHandler,
      },
    );

  const Animated = {
    Color: AnimatedColor,
    Event: AnimatedEvent,
    Interpolation: AnimatedInterpolation,
    Node: AnimatedNode,
    Value: AnimatedValue,
    ValueXY: AnimatedValueXY,
    add: (left: unknown, right: unknown) =>
      createAnimatedComputation(Number(toAnimatedValue(left)) + Number(toAnimatedValue(right))),
    attachNativeEvent: vi.fn(() => ({
      detach: vi.fn(),
    })),
    View: AnimatedView,
    createAnimatedComponent: <T,>(component: T) => component,
    decay: (value: AnimatedValue, config: { velocity?: number }) =>
      createAnimation((callback) =>
        runValueAnimation(
          value,
          value.__getValue() + Number(config.velocity ?? 0),
          0,
          callback,
        ),
      ),
    delay: (duration: number) =>
      createAnimation((callback) => {
        setTimeout(() => callback?.({ finished: true }), duration);
      }),
    diffClamp: (value: unknown, min: number, max: number) =>
      createAnimatedComputation(
        Math.max(min, Math.min(max, Number(toAnimatedValue(value)))),
      ),
    divide: (left: unknown, right: unknown) =>
      createAnimatedComputation(Number(toAnimatedValue(left)) / Number(toAnimatedValue(right))),
    event: (
      argMapping: unknown[],
      config?: {
        listener?: (...args: any[]) => void;
        useNativeDriver?: boolean;
      },
    ) => new AnimatedEvent(argMapping, config).handler,
    forkEvent: (
      event: ((...args: any[]) => void) | undefined,
      listener: ((...args: any[]) => void) | undefined,
    ) => createCombinedHandler(event, listener),
    loop: (
      animation: { start: (callback?: (result: { finished: boolean }) => void) => void; stop: () => void; reset?: () => void },
      config?: { iterations?: number },
    ) =>
      createAnimation((callback) => {
        const iterations = config?.iterations ?? -1;
        let runCount = 0;

        const run = () => {
          animation.start(() => {
            runCount += 1;
            if (iterations > 0 && runCount >= iterations) {
              callback?.({ finished: true });
              return;
            }

            run();
          });
        };

        run();
      }),
    modulo: (left: unknown, right: unknown) =>
      createAnimatedComputation(Number(toAnimatedValue(left)) % Number(toAnimatedValue(right))),
    multiply: (left: unknown, right: unknown) =>
      createAnimatedComputation(Number(toAnimatedValue(left)) * Number(toAnimatedValue(right))),
    parallel: (
      animations: Array<{
        start: (callback?: (result: { finished: boolean }) => void) => void;
        stop: () => void;
        reset?: () => void;
      }>,
    ) =>
      createAnimation((callback) => {
        if (animations.length === 0) {
          callback?.({ finished: true });
          return;
        }

        let completed = 0;
        animations.forEach((animation) => {
          animation.start(() => {
            completed += 1;
            if (completed === animations.length) {
              callback?.({ finished: true });
            }
          });
        });
      }),
    sequence: (
      animations: Array<{
        start: (callback?: (result: { finished: boolean }) => void) => void;
        stop: () => void;
        reset?: () => void;
      }>,
    ) =>
      createAnimation((callback) => {
        let index = 0;
        const run = () => {
          if (index >= animations.length) {
            callback?.({ finished: true });
            return;
          }

          animations[index].start(() => {
            index += 1;
            run();
          });
        };

        run();
      }),
    spring: (
      value: AnimatedValue,
      config: { toValue: number; useNativeDriver?: boolean },
    ) =>
      createAnimation((callback) =>
        runValueAnimation(value, config.toValue, 0, callback),
      ),
    stagger: (
      time: number,
      animations: Array<{
        start: (callback?: (result: { finished: boolean }) => void) => void;
        stop: () => void;
        reset?: () => void;
      }>,
    ) =>
      createAnimation((callback) => {
        if (animations.length === 0) {
          callback?.({ finished: true });
          return;
        }

        let completed = 0;
        animations.forEach((animation, index) => {
          setTimeout(() => {
            animation.start(() => {
              completed += 1;
              if (completed === animations.length) {
                callback?.({ finished: true });
              }
            });
          }, index * time);
        });
      }),
    subtract: (left: unknown, right: unknown) =>
      createAnimatedComputation(Number(toAnimatedValue(left)) - Number(toAnimatedValue(right))),
    timing: (
      value: AnimatedValue,
      config: { duration?: number; toValue: number; useNativeDriver?: boolean },
    ) =>
      createAnimation((callback) =>
        runValueAnimation(value, config.toValue, config.duration, callback),
      ),
    unforkEvent: (
      event: ((...args: any[]) => void) & { __rntlBaseHandler?: (...args: any[]) => void },
      _listener: ((...args: any[]) => void) | undefined,
    ) => event.__rntlBaseHandler ?? event,
  };
  const useAnimatedValue = (initialValue: number) => {
    const ref = React.useRef<InstanceType<typeof AnimatedValue> | null>(null);

    if (ref.current == null) {
      ref.current = new Animated.Value(initialValue);
    }

    return ref.current;
  };
  const reactNativeVersion =
    (platformModule as any).default?.constants?.reactNativeVersion ?? {
      major: 0,
      minor: 0,
      patch: 0,
      prerelease: null,
    };
  class ReactNativeVersion {
    static major = reactNativeVersion.major ?? 0;
    static minor = reactNativeVersion.minor ?? 0;
    static patch = reactNativeVersion.patch ?? 0;
    static prerelease = reactNativeVersion.prerelease ?? null;

    static getVersionString() {
      const prereleaseSuffix =
        ReactNativeVersion.prerelease != null ? `-${ReactNativeVersion.prerelease}` : '';
      return `${ReactNativeVersion.major}.${ReactNativeVersion.minor}.${ReactNativeVersion.patch}${prereleaseSuffix}`;
    }
  }
  const usePressability = vi.fn(
    (
      config:
        | (Record<string, unknown> & {
            [key: `on${string}`]: unknown;
          })
        | null
        | undefined,
    ) => {
      if (config == null) {
        return null;
      }

      return Object.fromEntries(
        Object.entries(config).filter(
          ([key, value]) => key.startsWith('on') && typeof value === 'function',
        ),
      );
    },
  );

  const reactNativeExports: Record<string, unknown> = {
    __esModule: true,
    AccessibilityInfo:
      (accessibilityInfoModule as any).default ?? accessibilityInfoModule,
    ActivityIndicator:
      (activityIndicatorModule as any).default ?? activityIndicatorModule,
    ActionSheetIOS,
    Alert,
    Animated,
    Appearance,
    AppRegistry,
    AppState: (appStateModule as any).default ?? appStateModule,
    BackHandler,
    Button,
    Clipboard: (clipboardModule as any).default ?? clipboardModule,
    codegenNativeCommands:
      (codegenNativeCommandsModule as any).default ?? codegenNativeCommandsModule,
    codegenNativeComponent:
      (codegenNativeComponentModule as any).default ?? codegenNativeComponentModule,
    DevMenu,
    DevSettings,
    DeviceEventEmitter,
    DeviceInfo,
    DynamicColorIOS,
    Dimensions,
    DrawerLayoutAndroid,
    findNodeHandle: (rendererProxyModule as any).findNodeHandle,
    FlatList,
    I18nManager,
    Image: (imageModule as any).default ?? imageModule,
    ImageBackground,
    InputAccessoryView,
    InteractionManager,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Linking: (linkingModule as any).default ?? linkingModule,
    LogBox,
    Modal: (modalModule as any).default ?? modalModule,
    NativeComponentRegistry:
      (nativeComponentRegistryModule as any).default ?? nativeComponentRegistryModule,
    NativeDialogManagerAndroid,
    NativeEventEmitter,
    NativeModules: (nativeModulesModule as any).default ?? nativeModulesModule,
    NativeAppEventEmitter,
    Networking,
    PanResponder,
    Platform: (platformModule as any).default ?? platformModule,
    PlatformColor,
    PixelRatio,
    PermissionsAndroid,
    Pressable,
    processColor,
    ProgressBarAndroid,
    PushNotificationIOS,
    RefreshControl: (refreshControlModule as any).default ?? refreshControlModule,
    ReactNativeVersion,
    registerCallableModule,
    requireNativeComponent:
      (requireNativeComponentModule as any).default ?? requireNativeComponentModule,
    RootTagContext,
    SafeAreaView,
    ScrollView: (scrollViewModule as any).default ?? scrollViewModule,
    SectionList,
    Settings,
    Share,
    StatusBar,
    StyleSheet: (styleSheetModule as any).default ?? styleSheetModule,
    Switch,
    Systrace,
    Text: (textModule as any).default ?? textModule,
    TextInput: (textInputModule as any).default ?? textInputModule,
    Touchable,
    TouchableHighlight,
    TouchableNativeFeedback,
    TouchableOpacity,
    TouchableWithoutFeedback,
    TurboModuleRegistry,
    UIManager: (uiManagerModule as any).default ?? uiManagerModule,
    UTFSequence,
    unstable_batchedUpdates: (rendererProxyModule as any).unstable_batchedUpdates,
    unstable_NativeText: NativeText,
    unstable_NativeView:
      (viewNativeComponentModule as any).default ?? viewNativeComponentModule,
    unstable_TextAncestorContext: TextAncestorContext,
    unstable_VirtualView: VirtualView,
    useAnimatedValue,
    useColorScheme: (useColorSchemeModule as any).default ?? useColorSchemeModule,
    usePressability,
    useWindowDimensions,
    Vibration: (vibrationModule as any).default ?? vibrationModule,
    View: (viewModule as any).default ?? viewModule,
    VirtualViewMode,
    VirtualizedList,
    VirtualizedSectionList,
    ToastAndroid,
    Easing,
    experimental_LayoutConformance: LayoutConformance,
  };

  const removedExports = [
    'ART',
    'ListView',
    'SwipeableListView',
    'WebView',
    'NetInfo',
    'CameraRoll',
    'ImageStore',
    'ImageEditor',
    'TimePickerAndroid',
    'ToolbarAndroid',
    'ViewPagerAndroid',
    'CheckBox',
    'SegmentedControlIOS',
    'StatusBarIOS',
    'PickerIOS',
    'Picker',
    'DatePickerAndroid',
    'MaskedViewIOS',
    'AsyncStorage',
    'ImagePickerIOS',
    'ProgressViewIOS',
    'DatePickerIOS',
    'Slider',
  ];

  for (const exportedName of removedExports) {
    Object.defineProperty(reactNativeExports, exportedName, {
      configurable: true,
      get() {
        throw new Error(`${exportedName} has been removed from React Native.`);
      },
    });
  }

  sharedReactNativeExports = reactNativeExports;
  return sharedReactNativeExports;
}

// Yarn PnP: keep ESM subpath imports on the same singleton mock registry that
// the CommonJS loader patch uses below.
vi.mock(
  'react-native/Libraries/Components/AccessibilityInfo/AccessibilityInfo',
  () => getSharedReactNativeMockModules().accessibilityInfoModule,
);
vi.mock(
  'react-native/Libraries/Core/InitializeCore',
  () => getSharedReactNativeMockModules().initializeCoreModule,
);
vi.mock(
  'react-native/Libraries/Core/NativeExceptionsManager',
  () => getSharedReactNativeMockModules().nativeExceptionsManagerModule,
);
vi.mock(
  'react-native/Libraries/Components/Clipboard/Clipboard',
  () => getSharedReactNativeMockModules().clipboardModule,
);
vi.mock(
  'react-native/Libraries/Utilities/codegenNativeCommands',
  () => getSharedReactNativeMockModules().codegenNativeCommandsModule,
);
vi.mock(
  'react-native/Libraries/Utilities/codegenNativeComponent',
  () => getSharedReactNativeMockModules().codegenNativeComponentModule,
);
vi.mock(
  'react-native/Libraries/Components/RefreshControl/RefreshControl',
  () => getSharedReactNativeMockModules().refreshControlModule,
);
vi.mock(
  'react-native/Libraries/Components/ActivityIndicator/ActivityIndicator',
  () => getSharedReactNativeMockModules().activityIndicatorModule,
);
vi.mock('react-native/Libraries/Image/Image', () => getSharedReactNativeMockModules().imageModule);
vi.mock('react-native/Libraries/Text/Text', () => getSharedReactNativeMockModules().textModule);
vi.mock(
  'react-native/Libraries/Components/TextInput/TextInput',
  () => getSharedReactNativeMockModules().textInputModule,
);
vi.mock('react-native/Libraries/Modal/Modal', () => getSharedReactNativeMockModules().modalModule);
vi.mock('react-native/Libraries/Components/View/View', () => getSharedReactNativeMockModules().viewModule);
vi.mock(
  'react-native/Libraries/Components/ScrollView/ScrollView',
  () => getSharedReactNativeMockModules().scrollViewModule,
);
vi.mock(
  'react-native/Libraries/BatchedBridge/NativeModules',
  () => getSharedReactNativeMockModules().nativeModulesModule,
);
vi.mock(
  'react-native/Libraries/ReactNative/UIManager',
  () => getSharedReactNativeMockModules().uiManagerModule,
);
vi.mock('react-native/Libraries/AppState/AppState', () => getSharedReactNativeMockModules().appStateModule);
vi.mock('react-native/Libraries/Linking/Linking', () => getSharedReactNativeMockModules().linkingModule);
vi.mock('react-native/Libraries/Vibration/Vibration', () => getSharedReactNativeMockModules().vibrationModule);
vi.mock(
  'react-native/Libraries/NativeComponent/NativeComponentRegistry',
  () => getSharedReactNativeMockModules().nativeComponentRegistryModule,
);
vi.mock(
  'react-native/Libraries/ReactNative/requireNativeComponent',
  () => getSharedReactNativeMockModules().requireNativeComponentModule,
);
vi.mock(
  'react-native/Libraries/Components/View/ViewNativeComponent',
  () => getSharedReactNativeMockModules().viewNativeComponentModule,
);
vi.mock(
  'react-native/Libraries/StyleSheet/StyleSheet',
  () => getSharedReactNativeMockModules().styleSheetModule,
);
vi.mock(
  'react-native/Libraries/Utilities/useColorScheme',
  () => getSharedReactNativeMockModules().useColorSchemeModule,
);
vi.mock(
  'react-native/Libraries/Utilities/Platform',
  () => getSharedReactNativeMockModules().platformModule,
);
vi.mock(
  'react-native/Libraries/ReactNative/RendererProxy',
  () => getSharedReactNativeMockModules().rendererProxyModule,
);

// Yarn PnP: some consumers still reach RN through CommonJS `require()`, so
// redirect those loads back to the shared facade and shared subpath mocks
// instead of letting mirrored package files create divergent instances.
function patchReactNativeResolution() {
  if (runtimeGlobals.__rntlVitestRnResolverPatched__ === true) {
    return;
  }

  const moduleWithPrivateResolver = Module as ModuleWithPrivateResolver;
  const originalResolveFilename = moduleWithPrivateResolver._resolveFilename;
  const originalLoad = moduleWithPrivateResolver._load;
  const reactNativeIndexPath = path.join(reactNativeMirrorRoot, 'react-native', 'index.js');
  const nativeComponentRegistryMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'NativeComponent',
    'NativeComponentRegistry.js',
  );
  const requireNativeComponentMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'ReactNative',
    'requireNativeComponent.js',
  );
  const initializeCoreMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Core',
    'InitializeCore.js',
  );
  const nativeExceptionsManagerMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Core',
    'NativeExceptionsManager.js',
  );
  const accessibilityInfoMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Components',
    'AccessibilityInfo',
    'AccessibilityInfo.js',
  );
  const clipboardMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Components',
    'Clipboard',
    'Clipboard.js',
  );
  const codegenNativeCommandsMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Utilities',
    'codegenNativeCommands.js',
  );
  const codegenNativeComponentMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Utilities',
    'codegenNativeComponent.js',
  );
  const refreshControlMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Components',
    'RefreshControl',
    'RefreshControl.js',
  );
  const activityIndicatorMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Components',
    'ActivityIndicator',
    'ActivityIndicator.js',
  );
  const imageMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Image',
    'Image.js',
  );
  const textMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Text',
    'Text.js',
  );
  const textInputMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Components',
    'TextInput',
    'TextInput.js',
  );
  const modalMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Modal',
    'Modal.js',
  );
  const viewMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Components',
    'View',
    'View.js',
  );
  const scrollViewMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Components',
    'ScrollView',
    'ScrollView.js',
  );
  const nativeModulesMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'BatchedBridge',
    'NativeModules.js',
  );
  const uiManagerMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'ReactNative',
    'UIManager.js',
  );
  const appStateMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'AppState',
    'AppState.js',
  );
  const linkingMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Linking',
    'Linking.js',
  );
  const vibrationMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Vibration',
    'Vibration.js',
  );
  const viewNativeComponentMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Components',
    'View',
    'ViewNativeComponent.js',
  );
  const useColorSchemeMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Utilities',
    'useColorScheme.js',
  );
  const platformMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'Utilities',
    'Platform.js',
  );
  const styleSheetMockPath = path.join(
    reactNativeMirrorRoot,
    'react-native',
    'Libraries',
    'StyleSheet',
    'StyleSheet.js',
  );
  const sharedMockModules = getSharedReactNativeMockModules();

  const tryResolveMirroredPackageRequest = (request: string) => {
    if (request === 'jest-react-native') {
      return path.join(reactNativeMirrorRoot, 'jest-react-native');
    }

    if (request.startsWith('jest-react-native/')) {
      return path.join(reactNativeMirrorRoot, 'jest-react-native', request.slice('jest-react-native/'.length));
    }

    if (request.startsWith('@react-native-community/')) {
      return path.join(reactNativeMirrorRoot, ...request.split('/'));
    }

    return null;
  };

  moduleWithPrivateResolver._resolveFilename = function patchedResolveFilename(
    request,
    parent,
    isMain,
    options,
  ) {
    if (request === 'react-native') {
      return originalResolveFilename.call(this, reactNativeIndexPath, parent, isMain, options);
    }

    if (request.startsWith('react-native/')) {
      return originalResolveFilename.call(
        this,
        path.join(reactNativeMirrorRoot, 'react-native', request.slice('react-native/'.length)),
        parent,
        isMain,
        options,
      );
    }

    if (request.startsWith('@react-native/')) {
      return originalResolveFilename.call(
        this,
        path.join(reactNativeMirrorRoot, request),
        parent,
        isMain,
        options,
      );
    }

    const mirroredPackageRequest = tryResolveMirroredPackageRequest(request);
    if (mirroredPackageRequest != null) {
      return originalResolveFilename.call(this, mirroredPackageRequest, parent, isMain, options);
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  moduleWithPrivateResolver._load = function patchedLoad(request, parent, isMain) {
    const resolved = moduleWithPrivateResolver._resolveFilename(request, parent, isMain);

    if (resolved === reactNativeIndexPath) {
      return getSharedReactNativeExports();
    }

    if (resolved === nativeComponentRegistryMockPath) {
      return sharedMockModules.nativeComponentRegistryModule;
    }

    if (resolved === requireNativeComponentMockPath) {
      return sharedMockModules.requireNativeComponentModule;
    }

    if (resolved === initializeCoreMockPath) {
      return sharedMockModules.initializeCoreModule;
    }

    if (resolved === nativeExceptionsManagerMockPath) {
      return sharedMockModules.nativeExceptionsManagerModule;
    }

    if (resolved === accessibilityInfoMockPath) {
      return sharedMockModules.accessibilityInfoModule;
    }

    if (resolved === clipboardMockPath) {
      return sharedMockModules.clipboardModule;
    }

    if (resolved === codegenNativeCommandsMockPath) {
      return sharedMockModules.codegenNativeCommandsModule;
    }

    if (resolved === codegenNativeComponentMockPath) {
      return sharedMockModules.codegenNativeComponentModule;
    }

    if (resolved === refreshControlMockPath) {
      return sharedMockModules.refreshControlModule;
    }

    if (resolved === activityIndicatorMockPath) {
      return sharedMockModules.activityIndicatorModule;
    }

    if (resolved === imageMockPath) {
      return sharedMockModules.imageModule;
    }

    if (resolved === textMockPath) {
      return sharedMockModules.textModule;
    }

    if (resolved === textInputMockPath) {
      return sharedMockModules.textInputModule;
    }

    if (resolved === modalMockPath) {
      return sharedMockModules.modalModule;
    }

    if (resolved === viewMockPath) {
      return sharedMockModules.viewModule;
    }

    if (resolved === scrollViewMockPath) {
      return sharedMockModules.scrollViewModule;
    }

    if (resolved === nativeModulesMockPath) {
      return sharedMockModules.nativeModulesModule;
    }

    if (resolved === uiManagerMockPath) {
      return sharedMockModules.uiManagerModule;
    }

    if (resolved === appStateMockPath) {
      return sharedMockModules.appStateModule;
    }

    if (resolved === linkingMockPath) {
      return sharedMockModules.linkingModule;
    }

    if (resolved === vibrationMockPath) {
      return sharedMockModules.vibrationModule;
    }

    if (resolved === viewNativeComponentMockPath) {
      return sharedMockModules.viewNativeComponentModule;
    }

    if (resolved === useColorSchemeMockPath) {
      return sharedMockModules.useColorSchemeModule;
    }

    if (resolved === platformMockPath) {
      return sharedMockModules.platformModule;
    }

    if (resolved === styleSheetMockPath) {
      return sharedMockModules.styleSheetModule;
    }

    if (isReactNativeAssetModuleId(resolved)) {
      return createReactNativeAssetModuleValue(resolved);
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  runtimeGlobals.__rntlVitestRnResolverPatched__ = true;
}

// Yarn PnP: top-level ESM imports of `react-native` must resolve to the same
// singleton facade that the CommonJS loader patch returns.
vi.mock('react-native', () => getSharedReactNativeExports());

installReactNativeGlobals(runtimeGlobals);
installNativeModuleProxy(runtimeGlobals);
patchReactNativeResolution();

export { createMockHostComponent, createMockNativeComponent };
