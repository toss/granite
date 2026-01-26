import type { MicroFrontendPluginOptions, SharedConfig } from '../types';

const SHARED_PRESETS: Record<string, string[]> = {
  'react-native': [
    'react-native/Libraries/BatchedBridge/BatchedBridge',
    'react-native/Libraries/BatchedBridge/NativeModules',
    'react-native/Libraries/BatchedBridge/MessageQueue',
    'react-native/Libraries/NativeComponent/NativeComponentRegistry',
    'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable',
    'react-native/Libraries/NativeComponent/ViewConfigIgnore',
    'react-native/Libraries/ReactNative/RendererProxy',
    'react-native/Libraries/StyleSheet/PlatformColorValueTypes',
    'react-native/Libraries/StyleSheet/normalizeColor',
    'react-native/Libraries/StyleSheet/processColor',
    'react-native/Libraries/TurboModule/TurboModuleRegistry',
    'react-native/Libraries/Utilities/NativePlatformConstantsIOS',
    'react-native/Libraries/Utilities/Platform',
    'react-native/Libraries/Utilities/defineLazyObjectProperty',
  ],
  react: ['react/jsx-runtime'],
};

export function intoShared(shared: MicroFrontendPluginOptions['shared']): SharedConfig | undefined {
  if (shared == null) {
    return undefined;
  }

  const normalized = Array.isArray(shared)
    ? shared.reduce(
        (acc, lib) => {
          acc[lib] = {};
          return acc;
        },
        {} as Record<string, SharedConfig[string]>
      )
    : { ...shared };

  for (const [lib, subpaths] of Object.entries(SHARED_PRESETS)) {
    const libConfig = normalized[lib];
    if (libConfig == null) {
      continue;
    }

    for (const subpath of subpaths) {
      if (normalized[subpath] == null) {
        normalized[subpath] = { ...libConfig };
      }
    }
  }

  return normalized;
}