import * as z from 'zod';
import type { Config as RollipopConfig } from 'rollipop';
import type {
  AdditionalMetroConfig,
  DevServerConfig,
  GranitePluginBuildPostHandler,
  GranitePluginBuildPreHandler,
  GranitePluginDevPostHandler,
  GranitePluginDevPreHandler,
  MetroDevServerConfig,
  PluginBuildConfig,
  PluginConfig,
  PluginInput,
} from '../types';

export const pluginConfigSchema = z.object({
  cwd: z.string().default(process.cwd()),
  appName: z.string(),
  host: z.string().optional(),
  scheme: z.string(),
  outdir: z.string().default('dist'),
  entryFile: z.string().default('./src/_app.tsx'),
  build: z.custom<PluginBuildConfig>().optional(),
  devServer: z.custom<DevServerConfig>().optional(),
  metro: z.custom<AdditionalMetroConfig & MetroDevServerConfig>().optional(),
  plugins: z.custom<PluginInput>(),
  reactNativePath: z.string().optional(),
});

type GraniteConfigInput = z.input<typeof pluginConfigSchema>;
export type GraniteRollipopConfig = Omit<RollipopConfig, 'root' | 'plugins'>;
export type GraniteConfig = GraniteConfigInput & GraniteRollipopConfig;
export type ParsedGraniteConfig = z.output<typeof pluginConfigSchema>;
export type CompleteGraniteConfig = {
  cwd: ParsedGraniteConfig['cwd'];
  appName: ParsedGraniteConfig['appName'];
  entryFile: ParsedGraniteConfig['entryFile'];
  outdir: ParsedGraniteConfig['outdir'];
  rollipopConfig?: GraniteRollipopConfig;
  pluginHooks: GranitePluginHooks;
  pluginConfigs: PluginConfig[];
  reactNativePath?: string;
};

export interface GranitePluginHooks {
  devServer: {
    preHandlers: GranitePluginDevPreHandler[];
    postHandlers: GranitePluginDevPostHandler[];
  };
  build: {
    preHandlers: GranitePluginBuildPreHandler[];
    postHandlers: GranitePluginBuildPostHandler[];
  };
}
