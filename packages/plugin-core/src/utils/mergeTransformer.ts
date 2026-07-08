import type {
  BuildConfig,
  TransformAsync,
  TransformBundleAsync,
  TransformBundleSync,
  TransformSync,
} from '../types';

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
  let transformBundleSync: TransformBundleSync | undefined;
  let transformBundleAsync: TransformBundleAsync | undefined;

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

  if (!(source.transformBundleSync || target.transformBundleSync)) {
    transformBundleSync = undefined;
  } else if (source.transformBundleSync && target.transformBundleSync) {
    transformBundleSync = (bundle, context) => {
      const sourceBundle = source.transformBundleSync?.(bundle, context) ?? bundle;
      return target.transformBundleSync?.(sourceBundle, context) ?? sourceBundle;
    };
  } else if (source.transformBundleSync) {
    transformBundleSync = source.transformBundleSync;
  } else if (target.transformBundleSync) {
    transformBundleSync = target.transformBundleSync;
  }

  if (!(source.transformBundleAsync || target.transformBundleAsync)) {
    transformBundleAsync = undefined;
  } else if (source.transformBundleAsync && target.transformBundleAsync) {
    transformBundleAsync = async (bundle, context) => {
      const sourceBundle = (await source.transformBundleAsync?.(bundle, context)) ?? bundle;
      return (await target.transformBundleAsync?.(sourceBundle, context)) ?? sourceBundle;
    };
  } else if (source.transformBundleAsync) {
    transformBundleAsync = source.transformBundleAsync;
  } else if (target.transformBundleAsync) {
    transformBundleAsync = target.transformBundleAsync;
  }

  return { transformSync, transformAsync, transformBundleSync, transformBundleAsync };
}
