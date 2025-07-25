import type { PluginConfig } from '../types';
import { mergeBabel } from './mergeBabel';
import { mergeDevServer } from './mergeDevServer';
import { mergeEsbuild } from './mergeEsbuild';
import { mergeExtra } from './mergeExtra';
import { mergeMetro } from './mergeMetro';
import { mergeResolver } from './mergeResolver';
import { mergeSwc } from './mergeSwc';
import { mergeTransformer } from './mergeTransformer';

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
