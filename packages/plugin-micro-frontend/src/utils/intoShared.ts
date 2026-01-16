import type { MicroFrontendPluginOptions, SharedConfig } from '../types';

const REACT_NATIVE_INTERNAL_SHARED = [
  'react-native/Libraries/NativeComponent/NativeComponentRegistry',
  'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable',
  'react-native/Libraries/NativeComponent/ViewConfigIgnore',
  'react-native/Libraries/ReactNative/RendererProxy',
];

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

  const reactNativeConfig = normalized['react-native'];
  if (reactNativeConfig == null) {
    return normalized;
  }

  for (const subpath of REACT_NATIVE_INTERNAL_SHARED) {
    if (normalized[subpath] == null) {
      normalized[subpath] = { ...reactNativeConfig };
    }
  }

  return normalized;
}
