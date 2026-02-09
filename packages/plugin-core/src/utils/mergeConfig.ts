import type { PluginConfig, PluginConfigContext } from '../types';
import { mergeBabel } from './mergeBabel';
import { mergeDevServer } from './mergeDevServer';
import { mergeEsbuild } from './mergeEsbuild';
import { mergeExtra } from './mergeExtra';
import { mergeMetro } from './mergeMetro';
import { mergeResolver } from './mergeResolver';
import { mergeSwc } from './mergeSwc';
import { mergeTransformer } from './mergeTransformer';

export interface MergeConfigOptions {
  configs: PluginConfig[];
  context: PluginConfigContext;
}

export async function mergeConfig({ configs, context }: MergeConfigOptions) {
  const [base, ...rest] = configs;

  if (base == null) {
    return undefined;
  }

  if (rest.length === 0) {
    return undefined;
  }

  return rest.reduce(
    async (acc, curr) => {
      const resolved = await Promise.all([acc, resolveDynamicConfig(curr, context)]);
      const resolvedAcc = resolved[0] ?? {};
      const resolvedCurr = resolved[1] ?? {};

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
        reactNativePath: resolvedCurr?.reactNativePath ?? resolvedAcc?.reactNativePath,
      };
    },
    resolveDynamicConfig(base, context)
  );
}

async function resolveDynamicConfig(config: PluginConfig, context: PluginConfigContext) {
  if (typeof config === 'function') {
    return await config(context);
  }

  return config;
}
