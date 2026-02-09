import { describe, expect, it } from 'vitest';
import { intoShared } from './intoShared';

describe('intoShared', () => {
  it('basic cases', () => {
    expect(intoShared(undefined)).toBeUndefined();

    expect(
      intoShared({
        react: {
          eager: true,
        },
        'react-native': {
          eager: true,
        },
      })
    ).toEqual({
      react: { eager: true },
      'react/jsx-runtime': { eager: true },
      'react/jsx-dev-runtime': { eager: true },
      'react-native': { eager: true },
      'react-native/Libraries/BatchedBridge/BatchedBridge': { eager: true },
      'react-native/Libraries/BatchedBridge/NativeModules': { eager: true },
      'react-native/Libraries/BatchedBridge/MessageQueue': { eager: true },
      'react-native/Libraries/NativeComponent/NativeComponentRegistry': { eager: true },
      'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable': { eager: true },
      'react-native/Libraries/NativeComponent/ViewConfigIgnore': { eager: true },
      'react-native/Libraries/ReactNative/RendererProxy': { eager: true },
      'react-native/Libraries/StyleSheet/PlatformColorValueTypes': { eager: true },
      'react-native/Libraries/StyleSheet/normalizeColor': { eager: true },
      'react-native/Libraries/StyleSheet/processColor': { eager: true },
      'react-native/Libraries/TurboModule/TurboModuleRegistry': { eager: true },
      'react-native/Libraries/Utilities/NativePlatformConstantsIOS': { eager: true },
      'react-native/Libraries/Utilities/Platform': { eager: true },
      'react-native/Libraries/Utilities/defineLazyObjectProperty': { eager: true },
    });

    expect(intoShared(['react', 'react-native'])).toEqual({
      react: {},
      'react/jsx-runtime': {},
      'react/jsx-dev-runtime': {},
      'react-native': {},
      'react-native/Libraries/BatchedBridge/BatchedBridge': {},
      'react-native/Libraries/BatchedBridge/NativeModules': {},
      'react-native/Libraries/BatchedBridge/MessageQueue': {},
      'react-native/Libraries/NativeComponent/NativeComponentRegistry': {},
      'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable': {},
      'react-native/Libraries/NativeComponent/ViewConfigIgnore': {},
      'react-native/Libraries/ReactNative/RendererProxy': {},
      'react-native/Libraries/StyleSheet/PlatformColorValueTypes': {},
      'react-native/Libraries/StyleSheet/normalizeColor': {},
      'react-native/Libraries/StyleSheet/processColor': {},
      'react-native/Libraries/TurboModule/TurboModuleRegistry': {},
      'react-native/Libraries/Utilities/NativePlatformConstantsIOS': {},
      'react-native/Libraries/Utilities/Platform': {},
      'react-native/Libraries/Utilities/defineLazyObjectProperty': {},
    });
  });
});
