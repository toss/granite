import { mergeConfig } from './mergeConfig';
import type { CompleteGraniteConfig } from '../schema/pluginConfig';
import type { ResolvedMetroConfig, ResolvedPluginConfig, StaticPluginConfig } from '../types';

const EMPTY_CONFIG: ResolvedPluginConfig = {};

export async function resolveConfig(config: CompleteGraniteConfig) {
  const [base, ...rest] = config.pluginConfigs;

  if (base == null) {
    return EMPTY_CONFIG;
  }

  const mergedConfig = (await mergeConfig(base, ...rest)) ?? EMPTY_CONFIG;
  const resolvedConfig: ResolvedPluginConfig = { ...mergedConfig, metro: resolveMetroConfig(mergedConfig) };

  return resolvedConfig;
}

/**
 * Injects the some config into the metro config to ensure compatibility with the plugin config.
 */
function resolveMetroConfig(pluginConfig: StaticPluginConfig): ResolvedMetroConfig {
  const metroConfig = pluginConfig.metro ?? {};

  return {
    ...metroConfig,
    babelConfig: pluginConfig.babel,
    transformSync: pluginConfig?.transformer?.transformSync,
  };
}
