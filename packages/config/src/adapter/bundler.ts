import type { BuildSuccessResult } from '../result';

export interface GraniteContext {
  readonly cwd: string;
  readonly appName: string;
  readonly scheme: string;
  readonly host: string;
}

export type BuildPlatform = 'android' | 'ios';

export interface BundlerBuildOption {
  platform: BuildPlatform;
  dev?: boolean;
  cache?: boolean;
  metafile?: boolean;
  outdir?: string;
  outdirSuffix?: string;
  outfile?: string;
  extra?: Record<string, unknown>;
}

export interface BundlerServerOptions {
  host?: string;
  port?: number;
  cache?: boolean;
  interactive?: boolean;
}

export interface DevServerHandle {
  close(): Promise<void>;
}

export interface BundlerAdapterContext {
  getContext(): Readonly<GraniteContext>;
}

export interface BundlerAdapter {
  readonly name: string;
  runBuild(this: BundlerAdapterContext, option: BundlerBuildOption): Promise<BuildSuccessResult>;
  runServer(this: BundlerAdapterContext, options: BundlerServerOptions): Promise<DevServerHandle>;
}

export interface ResolvedBundlerAdapter {
  readonly name: string;
  runBuild: OmitThisParameter<BundlerAdapter['runBuild']>;
  runServer: OmitThisParameter<BundlerAdapter['runServer']>;
}

export interface GraniteConfig {
  cwd?: string;
  appName: string;
  scheme: string;
  host?: string;
  bundler: BundlerAdapter;
}

export interface ResolvedGraniteConfig extends GraniteContext {
  bundler: ResolvedBundlerAdapter;
}
