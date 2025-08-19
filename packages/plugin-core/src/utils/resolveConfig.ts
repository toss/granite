import { mergeConfig } from './mergeConfig';
import type { CompleteGraniteConfig } from '../schema/pluginConfig';
import { StaticPluginConfig } from '../types';

const EMPTY_CONFIG: StaticPluginConfig = {};

export async function resolveConfig(config: CompleteGraniteConfig) {
  const [base, ...rest] = config.pluginConfigs;

  if (base == null) {
    return EMPTY_CONFIG;
  }

  return mergeConfig(base, ...rest).then((config) => config ?? EMPTY_CONFIG);
}
