import type * as esbuild from 'esbuild';
import type { BuildConfig } from './BuildConfig';

export type BuildResult = BuildSuccessResult | BuildFailureResult;

export interface BuildSuccessResult extends esbuild.BuildResult {
  bundle: BundleData;
  outfile: BuildConfig['outfile'];
  sourcemapOutfile: NonNullable<BuildConfig['sourcemapOutfile']>;
  platform: BuildConfig['platform'];
  extra: BuildConfig['extra'];
  totalModuleCount: number;
  duration: number;
  size: number;
}

export interface BuildFailureResult extends esbuild.BuildResult {
  platform: BuildConfig['platform'];
  extra: BuildConfig['extra'];
  duration: number;
}

export interface BundleData {
  source: esbuild.OutputFile;
  sourcemap: esbuild.OutputFile;
}
