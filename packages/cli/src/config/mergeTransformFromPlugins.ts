import type { GranitePluginCore } from '@granite-js/plugin-core';

export async function mergeTransformFromPlugins(plugins: GranitePluginCore[]) {
  const mergedTransformFunctions = plugins.reduce(
    (acc, plugin) => {
      if (plugin.transformSync) {
        acc.transformSync.push(plugin.transformSync);
      }

      if (plugin.transformAsync) {
        acc.transformAsync.push(plugin.transformAsync);
      }

      return acc;
    },
    {
      transformSync: [] as GranitePluginCore['transformSync'][],
      transformAsync: [] as GranitePluginCore['transformAsync'][],
    }
  );

  if (mergedTransformFunctions.transformSync.length === 0 && mergedTransformFunctions.transformAsync.length > 0) {
    console.warn(
      `Metro is only supported 'transformSync', but ${mergedTransformFunctions.transformAsync.length} 'transformAsync' are detected and it will be ignored.`
    );
  }

  return {
    transformSync: (id: string, code: string) => {
      return mergedTransformFunctions.transformSync.reduce((acc, transform) => transform?.(id, acc) ?? acc, code);
    },
    transformAsync: async (id: string, code: string) => {
      return mergedTransformFunctions.transformAsync.reduce(async (acc, transform) => {
        return (await transform?.(id, await acc)) ?? acc;
      }, Promise.resolve(code));
    },
  };
}
