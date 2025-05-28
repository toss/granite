import { mergeBanners } from './mergeBanners';
import { mergeInject } from './mergeInject';
import type { BuildConfig } from '../types';

export function mergeBuildConfigs(baseConfig: BuildConfig, ...otherConfigs: Partial<BuildConfig>[]): BuildConfig {
  const result = { ...baseConfig };

  for (const otherConfig of otherConfigs) {
    result.entry = otherConfig.entry ?? result.entry;
    result.outfile = otherConfig.outfile ?? result.outfile;
    result.esbuild = {
      ...result.esbuild,
      ...otherConfig.esbuild,
      define: { ...result.esbuild?.define, ...otherConfig.esbuild?.define },
      banner: mergeBanners(result.esbuild?.banner ?? {}, otherConfig.esbuild?.banner ?? {}),
      inject: mergeInject(result.esbuild?.inject ?? [], otherConfig.esbuild?.inject ?? []),
      prelude: mergeInject(result.esbuild?.prelude ?? [], otherConfig.esbuild?.prelude ?? []),
    };
    result.babel = {
      ...result.babel,
      ...otherConfig.babel,
      conditions: [...(result.babel?.conditions ?? []), ...(otherConfig.babel?.conditions ?? [])],
    };
    result.swc = {
      plugins: [...(result.swc?.plugins ?? []), ...(otherConfig.swc?.plugins ?? [])],
    };
    result.resolver = {
      alias: [...(result.resolver?.alias ?? []), ...(otherConfig.resolver?.alias ?? [])],
      protocols: { ...result.resolver?.protocols, ...otherConfig.resolver?.protocols },
    };
    result.platform = otherConfig.platform ?? result.platform;
    result.extra = otherConfig.extra ?? result.extra;
  }

  return result;
}
