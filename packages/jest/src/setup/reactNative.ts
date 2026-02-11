import { requireFromRoot } from '../utils/requireFromRoot';

interface ReactNativeSetupOptions {
  rootDir: string;
}

export function setupReactNative({ rootDir }: ReactNativeSetupOptions) {
  setupGestureHandler({ rootDir });
  setupAppState();
  setupBridgeModule();
  setupWebView();
}

function setupGestureHandler({ rootDir }: ReactNativeSetupOptions) {
  requireFromRoot('@granite-js/native/react-native-gesture-handler/jestSetup', rootDir);

  /**
   * react-native-gesture-handler uses setImmediate.
   * setImmediate uses jest.now() through react-native's jest setup.
   * Therefore, jest.useFakeTimers must be configured.
   */
  jest.useFakeTimers();
}

function setupAppState() {
  const ReactNative = require('react-native');
  ReactNative.AppState.currentState = 'active';
}

function setupBridgeModule() {
  const ReactNative = require('react-native');
  ReactNative.NativeModules.GraniteModule = {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  };
  ReactNative.NativeModules.GraniteCoreModule = {};
  ReactNative.NativeModules.BrickModule = {
    getConstants: jest.fn(() => ({})),
    getRegisteredModules: jest.fn(() => []),
  };
}

function setupWebView() {
  /**
   * Since WebView cannot be mocked, it is provided as a View.
   */
  jest.mock('@granite-js/native/react-native-webview', () => ({ WebView: require('react-native').View }));
}
