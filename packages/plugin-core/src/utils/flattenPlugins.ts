import type { PluginInput, GranitePluginCore } from '../types';

export const flattenPlugins = async (plugin: PluginInput): Promise<GranitePluginCore[]> => {
  if (Array.isArray(plugin)) {
    const flattened = await Promise.all(
      plugin.map(async (p) => {
        if (p instanceof Promise) {
          const resolved = await p;
          if (Array.isArray(resolved)) {
            const nested = await Promise.all(resolved.map(flattenPlugins));
            return nested.flat();
          }
          return flattenPlugins(resolved);
        }
        return flattenPlugins(p);
      })
    );
    return flattened.flat();
  }

  const resolved = await plugin;
  return [resolved];
};
