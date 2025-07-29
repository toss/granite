import * as z from 'zod';
import type {
  AdditionalMetroConfig,
  BuildConfig,
  DevServerConfig,
  GranitePluginBuildPostHandler,
  GranitePluginBuildPreHandler,
  GranitePluginDevPostHandler,
  GranitePluginDevPreHandler,
  MetroDevServerConfig,
  PluginBuildConfig,
  PluginInput,
} from '../types';

export const pluginConfigSchema = z.object({
  cwd: z.string().default(process.cwd()),
  appName: z.string(),
  scheme: z.string(),
  outdir: z.string().default('dist'),
  entryFile: z.string().default('./src/_app.tsx'),
  build: z.custom<PluginBuildConfig>().optional(),
  devServer: z.custom<DevServerConfig>().optional(),
  metro: z.custom<AdditionalMetroConfig & MetroDevServerConfig>().optional(),
  plugins: z.custom<PluginInput>(),
});

export type GraniteConfig = z.input<typeof pluginConfigSchema>;
export type ParsedGraniteConfig = z.output<typeof pluginConfigSchema>;
export type CompleteGraniteConfig = Pick<
  ParsedGraniteConfig,
  'cwd' | 'appName' | 'entryFile' | 'outdir' | 'devServer' | 'metro'
> & {
  build: Omit<BuildConfig, 'platform' | 'entry' | 'outfile'>;
  pluginHooks: GranitePluginHooks;
};
export type LazyCompleteGraniteConfig<Params = any> = (params: Params) => Promise<CompleteGraniteConfig>;

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
