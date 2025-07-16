import type { MicroFrontendPluginOptions, SharedConfig } from '../types';

export function intoShared(shared: MicroFrontendPluginOptions['shared']): SharedConfig | undefined {
  if (Array.isArray(shared)) {
    return shared.reduce(
      (acc, lib) => {
        acc[lib] = {};
        return acc;
      },
      {} as Record<string, SharedConfig[string]>
    );
  }

  return shared;
}
