import type { BuildConfig } from '../types';

export function mergeBabel(source: BuildConfig['babel'], target: BuildConfig['babel']): BuildConfig['babel'] {
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
    rules: [...(source.rules ?? []), ...(target.rules ?? [])],
  };
}
