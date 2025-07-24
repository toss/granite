import { mergeResolver, mergeTransformer, mergeEsbuild, mergeBabel, mergeSwc, mergeExtra } from '@granite-js/mpack';
import type { PluginConfig } from '../types';
import { mergeDevServer } from './mergeDevServer';
import { mergeMetro } from './mergeMetro';

export function mergeConfig(base: PluginConfig, ...configs: PluginConfig[]) {
  if (!(base || configs.length)) {
    return undefined;
  }

  return configs.reduce(
    (acc, curr) => ({
      ...acc,
      ...curr,
      resolver: mergeResolver(acc?.resolver, curr?.resolver),
      transformer: mergeTransformer(acc?.transformer, curr?.transformer),
      esbuild: mergeEsbuild(acc?.esbuild, curr?.esbuild),
      babel: mergeBabel(acc?.babel, curr?.babel),
      swc: mergeSwc(acc?.swc, curr?.swc),
      devServer: mergeDevServer(acc?.devServer, curr?.devServer),
      metro: mergeMetro(acc?.metro, curr?.metro),
      extra: mergeExtra(acc?.extra, curr?.extra),
    }),
    base
  );
}
