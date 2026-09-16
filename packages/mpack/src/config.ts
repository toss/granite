import type { GraniteContext } from '@granite-js/config';
import type { GraniteConfig as LegacyGraniteConfig } from '@granite-js/plugin-core';
import type { PluginFactory } from './types';

type LegacyMpackConfig = Pick<
  LegacyGraniteConfig,
  'entryFile' | 'outdir' | 'build' | 'metro' | 'devServer' | 'reactNativePath'
> & {
  plugins?: LegacyGraniteConfig['plugins'];
};

export interface MpackConfig extends LegacyMpackConfig {
  buildPlugins?: PluginFactory[];
}

export interface MpackConfigContext extends GraniteContext {
  command: 'build' | 'serve';
  mode: 'development' | 'production';
}

export type MpackUserConfig = MpackConfig | ((context: MpackConfigContext) => MpackConfig | Promise<MpackConfig>);

export function defineConfig(config: MpackUserConfig): MpackUserConfig {
  return config;
}
