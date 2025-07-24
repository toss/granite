import type { BuildConfig } from '../types';

export function mergeResolver(
  source: BuildConfig['resolver'],
  target: BuildConfig['resolver']
): BuildConfig['resolver'] {
  if (!(source || target)) {
    return undefined;
  }

  if (source == null) {
    return target;
  }

  if (target == null) {
    return source;
  }

  return {
    alias: [...(source.alias ?? []), ...(target.alias ?? [])],
    protocols: {
      ...source.protocols,
      ...target.protocols,
    },
  };
}
