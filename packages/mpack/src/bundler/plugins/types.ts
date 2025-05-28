import type { BundlerConfig, INTERNAL__Id } from '../../types';

export type PluginOptions<T = object> = T & {
  context: {
    id: INTERNAL__Id;
    config: BundlerConfig;
  };
};
