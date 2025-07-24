import { BuildConfig } from '../types';

type Banner = { [type: string]: string };

export function mergeEsbuild(source: BuildConfig['esbuild'], target: BuildConfig['esbuild']): BuildConfig['esbuild'] {
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
    define: { ...source.define, ...target.define },
    inject: [...(source.inject || []), ...(target.inject || [])],
    prelude: [...(source.prelude || []), ...(target.prelude || [])],
    banner: mergeBanners(source.banner ?? {}, target.banner ?? {}),
  };
}

function mergeBanners(baseBanner: Banner, overrideBanner: Banner) {
  const result = { ...baseBanner };

  for (const [key, value] of Object.entries(overrideBanner)) {
    result[key] = `${result[key] ?? ''}\n${value}`;
  }

  return result;
}
