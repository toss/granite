import type { PluginConfig } from '../types';
import { mergeBabel } from './mergeBabel';
import { mergeDevServer } from './mergeDevServer';
import { mergeEsbuild } from './mergeEsbuild';
import { mergeExtra } from './mergeExtra';
import { mergeMetro } from './mergeMetro';
import { mergeResolver } from './mergeResolver';
import { mergeSwc } from './mergeSwc';
import { mergeTransformer } from './mergeTransformer';

export async function mergeConfig(base: PluginConfig, ...configs: PluginConfig[]) {
  if (!(base || configs.length)) {
    return undefined;
  }

  return configs.reduce(async (acc, curr) => {
    const [resolvedAcc, resolvedCurr] = await Promise.all([acc, resolveDynamicConfig(curr)]);

    return {
      ...resolvedAcc,
      ...resolvedCurr,
      resolver: mergeResolver(resolvedAcc?.resolver, resolvedCurr?.resolver),
      transformer: mergeTransformer(resolvedAcc?.transformer, resolvedCurr?.transformer),
      esbuild: mergeEsbuild(resolvedAcc?.esbuild, resolvedCurr?.esbuild),
      babel: mergeBabel(resolvedAcc?.babel, resolvedCurr?.babel),
      swc: mergeSwc(resolvedAcc?.swc, resolvedCurr?.swc),
      devServer: mergeDevServer(resolvedAcc?.devServer, resolvedCurr?.devServer),
      metro: mergeMetro(resolvedAcc?.metro, resolvedCurr?.metro),
      extra: mergeExtra(resolvedAcc?.extra, resolvedCurr?.extra),
      reactNativePath: resolvedCurr.reactNativePath ?? resolvedAcc.reactNativePath,
    };
  }, resolveDynamicConfig(base));
}

async function resolveDynamicConfig(config: PluginConfig) {
  if (typeof config === 'function') {
    return await config();
  }

  return config;
}
