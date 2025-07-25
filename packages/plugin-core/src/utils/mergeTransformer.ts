import type { BuildConfig, TransformSync, TransformAsync } from '../types';

export function mergeTransformer(
  source: BuildConfig['transformer'],
  target: BuildConfig['transformer']
): BuildConfig['transformer'] {
  if (!(source || target)) {
    return undefined;
  }

  if (source == null) {
    return target;
  }

  if (target == null) {
    return source;
  }

  let transformSync: TransformSync | undefined;
  let transformAsync: TransformAsync | undefined;

  if (!(source.transformSync || target.transformSync)) {
    transformSync = undefined;
  } else if (source.transformSync && target.transformSync) {
    transformSync = (id: string, code: string) => {
      let src = code;
      src = source.transformSync?.(id, src) ?? src;
      src = target.transformSync?.(id, src) ?? src;
      return src;
    };
  } else if (source.transformSync) {
    transformSync = source.transformSync;
  } else if (target.transformSync) {
    transformSync = target.transformSync;
  }

  if (!(source.transformAsync || target.transformAsync)) {
    transformAsync = undefined;
  } else if (source.transformAsync && target.transformAsync) {
    transformAsync = async (id: string, code: string) => {
      let src = code;
      src = (await source.transformAsync?.(id, src)) ?? src;
      src = (await target.transformAsync?.(id, src)) ?? src;
      return src;
    };
  } else if (source.transformAsync) {
    transformAsync = source.transformAsync;
  } else if (target.transformAsync) {
    transformAsync = target.transformAsync;
  }

  return { transformSync, transformAsync };
}
