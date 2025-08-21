import type { BuildConfig } from './BuildConfig';
import type { BuildResult } from './BuildResult';
import type { DevServerConfig, MetroDevServerConfig } from './DevServerConfig';
import type { AdditionalMetroConfig } from './MetroConfig';

export interface GranitePluginConfig {
  entryFile: string;
  cwd: string;
  appName: string;
  outdir: string;
}

export interface GranitePluginDevHandlerArgs extends GranitePluginConfig {
  host: string;
  port: number;
}

export type GranitePluginPreHandlerArgs = GranitePluginConfig;

export interface GranitePluginPostHandlerArgs extends GranitePluginConfig {
  buildResults: BuildResult[];
}

export interface PluginContext {
  meta: any;
}

export type GranitePluginDevPreHandler = (
  this: PluginContext,
  args: GranitePluginDevHandlerArgs
) => void | Promise<void>;
export type GranitePluginDevPostHandler = (
  this: PluginContext,
  args: GranitePluginDevHandlerArgs
) => void | Promise<void>;
export type GranitePluginBuildPreHandler = (
  this: PluginContext,
  args: GranitePluginPreHandlerArgs
) => void | Promise<void>;
export type GranitePluginBuildPostHandler = (
  this: PluginContext,
  args: GranitePluginPostHandlerArgs
) => void | Promise<void>;

export interface GranitePluginCore {
  /**
   * Plugin name
   */
  name: string;
  /**
   * Dev handler (granite dev command)
   */
  dev?:
    | {
        order: 'pre';
        handler: GranitePluginDevPreHandler;
      }
    | {
        order: 'post';
        handler: GranitePluginDevPostHandler;
      };
  /**
   * Build handler (granite build command)
   */
  build?:
    | {
        order: 'pre';
        handler: GranitePluginBuildPreHandler;
      }
    | {
        order: 'post';
        handler: GranitePluginBuildPostHandler;
      };
  /**
   * Plugin config
   */
  config?: PluginConfig;
}
export type PluginConfig = StaticPluginConfig | DynamicPluginConfig;

export type StaticPluginConfig = Omit<PluginBuildConfig, 'platform' | 'outfile'> & {
  devServer?: DevServerConfig;
  metro?: PluginMetroConfig;
};

export type DynamicPluginConfig = (() => StaticPluginConfig) | (() => Promise<StaticPluginConfig>);

// Omitted options are configured by `PluginBuildConfig['babel']`, `PluginBuildConfig['transformer']`
export type PluginMetroConfig = Omit<ResolvedMetroConfig, 'babelConfig' | 'transformSync'>;

export type ResolvedPluginConfig = Omit<StaticPluginConfig, 'metro'> & { metro?: ResolvedMetroConfig };
export type ResolvedMetroConfig = AdditionalMetroConfig & MetroDevServerConfig;

export type PluginResolvable =
  | GranitePlugin // Plugin definition (e.g. { name: string; config?: any })
  | GranitePluginCore // Or plugin's default form
  | Promise<GranitePlugin>
  | Promise<GranitePluginCore>;

export type PluginInput = PluginResolvable | PluginInput[];

export type PluginBuildConfig = Omit<BuildConfig, 'platform' | 'entry' | 'outfile'>;

export type GranitePlugin = GranitePluginCore | Promise<GranitePluginCore>;
