import type { SharedConfig, SharedModuleConfig } from '../runtime/registry';
import type { MicroFrontendPluginOptions } from './types';

const SHARED_PRESETS = {
  react: ['react/jsx-runtime', 'react/jsx-dev-runtime'],
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
} as const;

export function intoShared(shared: MicroFrontendPluginOptions['shared']): SharedConfig | undefined {
  if (shared == null) {
    return undefined;
  }

  const normalized: Record<string, SharedModuleConfig> = {};
  if (Array.isArray(shared)) {
    for (const moduleName of shared) {
      normalized[moduleName] = {};
    }
  } else {
    Object.assign(normalized, shared);
  }

  for (const [moduleName, subpaths] of Object.entries(SHARED_PRESETS)) {
    const moduleConfig = normalized[moduleName];
    if (moduleConfig == null) {
      continue;
    }

    for (const subpath of subpaths) {
      normalized[subpath] ??= { ...moduleConfig };
    }
  }

  return normalized;
}
