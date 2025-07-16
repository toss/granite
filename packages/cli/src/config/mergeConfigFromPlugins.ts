import { flattenPlugins, type GranitePluginCore, type PluginInput } from '@granite-js/plugin-core';
import { mergeWith } from 'es-toolkit';

function concatArray<T = unknown, S = unknown>(objValue: T, srcValue: S) {
  if (Array.isArray(objValue) && Array.isArray(srcValue)) {
    return objValue.concat(srcValue);
  }
  return;
}

function mergeMetroConfig<T = unknown, S = unknown>(objValue: T, srcValue: S, key: string) {
  if (key === 'getPolyfills' && typeof objValue === 'function' && typeof srcValue === 'function') {
    return () => [...objValue(), ...srcValue()];
  }
  return undefined;
}

function mergeEsbuildConfig<T = unknown, S = unknown>(objValue: T, srcValue: S, key: string) {
  if (key === 'banner' && typeof objValue === 'object' && typeof srcValue === 'object') {
    return Object.entries(srcValue ?? {}).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: [acc[key], value].join('\n'),
      }),
      (objValue ?? {}) as Record<string, string>
    );
  }

  if (key === 'footer' && typeof objValue === 'object' && typeof srcValue === 'object') {
    return Object.entries(srcValue ?? {}).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: [acc[key], value].join('\n'),
      }),
      (objValue ?? {}) as Record<string, string>
    );
  }

  return undefined;
}

function mergeResolverConfig<T = unknown, S = unknown>(objValue: T, srcValue: S, key: string) {
  if (key === 'alias' && Array.isArray(objValue) && Array.isArray(srcValue)) {
    return [...objValue, ...srcValue];
  }

  if (key === 'protocols' && typeof objValue === 'object' && typeof srcValue === 'object') {
    return { ...objValue, ...srcValue };
  }

  return undefined;
}

function combineComparers<T extends Record<PropertyKey, any>, S extends Record<PropertyKey, any>>(
  ...fns: Parameters<typeof mergeWith>[2][]
) {
  return (targetValue: unknown, sourceValue: unknown, key: string, target: T, source: S) => {
    for (const fn of fns) {
      const result = fn(targetValue, sourceValue, key, target, source);
      if (result !== undefined) {
        return result;
      }
    }
    return undefined;
  };
}

export async function mergeConfigFromPlugins(plugins: PluginInput): Promise<GranitePluginCore['config']> {
  const pluginsResolved = await flattenPlugins(plugins);
  return pluginsResolved.reduce(
    (acc, plugin) =>
      mergeWith(
        acc,
        plugin.config ?? {},
        combineComparers(concatArray, mergeMetroConfig, mergeEsbuildConfig, mergeResolverConfig)
      ),
    {}
  );
}
