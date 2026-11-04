import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRecordedComponentProvider, resetComponentProviderStoreForTest } from './componentProviderStore';
import { installComponentProviderRecorderOn } from './installComponentProviderRecorder';

function Demo() {
  return null;
}

function createAppRegistry() {
  return {
    registerComponent: vi.fn<(appKey: string, componentProvider: () => unknown, section?: boolean) => string>(
      (appKey) => appKey
    ),
    runApplication: vi.fn(),
  };
}

/** A CommonJS `react-native` exports object whose `AppRegistry` is an accessor, as bundlers emit it. */
function createReactNativeExports(options: { readonly configurable: boolean }) {
  const appRegistry = createAppRegistry();
  const reactNativeExports = {} as { readonly AppRegistry: typeof appRegistry };
  Object.defineProperty(reactNativeExports, 'AppRegistry', {
    configurable: options.configurable,
    enumerable: true,
    get: () => appRegistry,
  });
  return { appRegistry, reactNativeExports };
}

describe('installComponentProviderRecorderOn', () => {
  beforeEach(() => {
    resetComponentProviderStoreForTest();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records providers registered through AppRegistry and keeps the original registration', () => {
    // Given
    const { appRegistry, reactNativeExports } = createReactNativeExports({ configurable: true });
    const provider = () => Demo;

    // When
    const isInstalled = installComponentProviderRecorderOn(reactNativeExports, () => reactNativeExports.AppRegistry);
    const appKey = reactNativeExports.AppRegistry.registerComponent('Demo', provider);

    // Then
    expect(isInstalled).toBe(true);
    expect(appKey).toBe('Demo');
    expect(getRecordedComponentProvider('Demo')?.componentProvider).toBe(provider);
    expect(appRegistry.registerComponent).toHaveBeenCalledWith('Demo', provider, undefined);
    expect(reactNativeExports.AppRegistry.runApplication).toBe(appRegistry.runApplication);
  });

  it('reports a failure when consumers cannot see the recording AppRegistry', () => {
    // Given
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { reactNativeExports } = createReactNativeExports({ configurable: false });

    // When
    const isInstalled = installComponentProviderRecorderOn(reactNativeExports, () => reactNativeExports.AppRegistry);
    reactNativeExports.AppRegistry.registerComponent('Demo', () => Demo);

    // Then
    expect(isInstalled).toBe(false);
    expect(getRecordedComponentProvider('Demo')).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });

  it('wraps AppRegistry only once', () => {
    // Given
    const { appRegistry, reactNativeExports } = createReactNativeExports({ configurable: true });
    installComponentProviderRecorderOn(reactNativeExports, () => reactNativeExports.AppRegistry);
    const recordingRegisterComponent = reactNativeExports.AppRegistry.registerComponent;

    // When
    const isInstalled = installComponentProviderRecorderOn(reactNativeExports, () => reactNativeExports.AppRegistry);
    reactNativeExports.AppRegistry.registerComponent('Demo', () => Demo);

    // Then
    expect(isInstalled).toBe(true);
    expect(reactNativeExports.AppRegistry.registerComponent).toBe(recordingRegisterComponent);
    expect(appRegistry.registerComponent).toHaveBeenCalledOnce();
  });
});
