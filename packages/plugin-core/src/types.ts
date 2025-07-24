import type {
  BabelConfig,
  BuildResult,
  EsbuildConfig,
  SwcConfig,
  ResolverConfig,
  AdditionalMetroConfig,
  MetroDevServerConfig,
  DevServerConfig,
  BuildConfig as InternalBuildConfig,
} from '@granite-js/mpack';

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

export type GranitePluginDevPreHandler = (this: PluginContext, args: GranitePluginDevHandlerArgs) => void | Promise<void>;
export type GranitePluginDevPostHandler = (this: PluginContext, args: GranitePluginDevHandlerArgs) => void | Promise<void>;
export type GranitePluginBuildPreHandler = (this: PluginContext, args: GranitePluginPreHandlerArgs) => void | Promise<void>;
export type GranitePluginBuildPostHandler = (this: PluginContext, args: GranitePluginPostHandlerArgs) => void | Promise<void>;

export interface GranitePluginCore {
  /**
   * Plugin name
   */
  name: string;
  /**
   * Dev handler
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
   * Build handler
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
  config?: PluginConfig;
}

export type PluginConfig = Omit<BuildConfig, 'platform' | 'outfile'> & {
  devServer?: DevServerConfig;
  metro?: MetroConfig;
};

export type MetroConfig = Omit<AdditionalMetroConfig, 'babelConfig' | 'transformSync'> & MetroDevServerConfig;

export type GranitePlugin = GranitePluginCore | Promise<GranitePluginCore>;

export type PluginResolvable =
  | GranitePlugin // Plugin definition (e.g. { name: string; config?: any })
  | GranitePluginCore // Or plugin's default form
  | Promise<GranitePlugin>
  | Promise<GranitePluginCore>;

export type PluginInput = PluginResolvable | PluginInput[];

export type BuildConfig = Omit<InternalBuildConfig, 'platform' | 'entry' | 'outfile'>;

export type { BabelConfig, EsbuildConfig, SwcConfig, ResolverConfig };
