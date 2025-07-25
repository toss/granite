import type { BuildConfig } from '../types';
import { mergeBabel } from './mergeBabel';
import { mergeEsbuild } from './mergeEsbuild';
import { mergeExtra } from './mergeExtra';
import { mergeResolver } from './mergeResolver';
import { mergeSwc } from './mergeSwc';
import { mergeTransformer } from './mergeTransformer';

export function mergeBuildConfigs(baseConfig: BuildConfig, ...otherConfigs: Partial<BuildConfig>[]): BuildConfig {
  const mergedConfig = otherConfigs.reduce(
    (acc, curr) => ({
      entry: acc.entry ?? curr.entry,
      outfile: acc.outfile ?? curr.outfile,
      platform: acc.platform ?? curr.platform,
      resolver: mergeResolver(acc.resolver, curr.resolver),
      transformer: mergeTransformer(acc.transformer, curr.transformer),
      esbuild: mergeEsbuild(acc.esbuild, curr.esbuild),
      swc: mergeSwc(acc.swc, curr.swc),
      babel: mergeBabel(acc.babel, curr.babel),
      extra: mergeExtra(acc.extra, curr.extra),
    }),
    baseConfig
  );

  return mergedConfig as BuildConfig;
}
