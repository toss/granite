import type { BuildConfig } from '../types';

export function mergeSwc(source: BuildConfig['swc'], target: BuildConfig['swc']): BuildConfig['swc'] {
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
    ...source,
    ...target,
    plugins: [...(source.plugins || []), ...(target.plugins || [])],
  };
}
