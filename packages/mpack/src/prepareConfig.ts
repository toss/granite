import * as path from 'node:path';
import type { BundlerBuildOption, GraniteContext } from '@granite-js/config';
import { defineConfig as resolveLegacyConfig, type PluginConfig } from '@granite-js/plugin-core';
import type { MpackConfig } from './config';

export type LegacyCompatibleBuildOption = BundlerBuildOption & {
  legacyConfigs?: PluginConfig[];
};

type BuildOverrides = Pick<BundlerBuildOption, 'outdir' | 'outdirSuffix' | 'extra'> & {
  legacyConfigs?: PluginConfig[];
};

export async function prepareConfig(options: MpackConfig, context: GraniteContext, buildOption?: BuildOverrides) {
  const config = await resolveLegacyConfig({
    ...options,
    ...context,
    plugins: options.plugins ?? [],
  });

  if (buildOption?.outdir != null) {
    config.outdir = path.resolve(context.cwd, buildOption.outdir);
  }
  if (buildOption?.outdirSuffix != null) {
    config.outdir = path.join(config.outdir, buildOption.outdirSuffix);
  }
  config.pluginConfigs.push(...(buildOption?.legacyConfigs ?? []));
  if (buildOption?.extra != null) {
    config.pluginConfigs.push({ extra: buildOption.extra });
  }

  return config;
}
