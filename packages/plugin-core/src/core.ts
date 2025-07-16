import type {
  BabelConfig,
  BuildResult,
  EsbuildConfig,
  MetroConfig,
  SwcConfig,
  ResolverConfig,
} from '@granite-js/mpack';
import type { MpackConfig } from './types/mpackConfig';

type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

export interface GranitePluginConfig {
  entryFile: string;
  cwd: string;
  appName: string;
  outdir: string;
}

export interface GranitePluginDevConfig extends GranitePluginConfig {
  host: string;
  port: number;
}

export interface GranitePluginBuildConfig extends GranitePluginConfig {
  buildResults: BuildResult[];
}

export interface PluginContext {
  meta: any;
}

export interface GranitePluginCore {
  name: string;
  dev?: {
    order: 'pre' | 'post';
    handler: (config: GranitePluginDevConfig) => void | Promise<void>;
  };
  build?:
    | {
        order: 'pre';
        handler: (
          this: PluginContext,
          {
            appName,
            outdir,
            buildResults,
          }: {
            entryFile: string;
            cwd: string;
            appName: string;
            outdir: string;
            buildResults: BuildResult[];
          }
        ) => void | Promise<void>;
      }
    | {
        order: 'post';
        handler: (this: PluginContext, config: GranitePluginBuildConfig) => void | Promise<void>;
      };
  transformSync?: (id: string, code: string) => string;
  transformAsync?: (id: string, code: string) => Promise<string>;
  config?: {
    mpack?: DeepPartial<MpackConfig>;
    metro?: DeepPartial<MetroConfig>;
    babel?: DeepPartial<BabelConfig>;
    esbuild?: DeepPartial<EsbuildConfig>;
    swc?: DeepPartial<SwcConfig>;
    resolver?: DeepPartial<ResolverConfig>;
  };
}

export type GranitePlugin = GranitePluginCore | Promise<GranitePluginCore>;

export type PluginResolvable =
  | GranitePlugin // 플러그인 정의 (예: { name: string; config?: any })
  | GranitePluginCore // 혹은 플러그인의 기본 형태
  | Promise<GranitePlugin>
  | Promise<GranitePluginCore>;

export type PluginInput = PluginResolvable | PluginInput[];
