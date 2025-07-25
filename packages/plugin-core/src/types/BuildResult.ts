import type * as esbuild from 'esbuild';
import type { BuildConfig } from './BuildConfig';

export interface BuildResult extends esbuild.BuildResult {
  bundle: BundleData;
  outfile: BuildConfig['outfile'];
  sourcemapOutfile: NonNullable<BuildConfig['sourcemapOutfile']>;
  platform: BuildConfig['platform'];
  extra: BuildConfig['extra'];
  totalModuleCount: number;
  duration: number;
  size: number;
}

export interface BundleData {
  source: esbuild.OutputFile;
  sourcemap: esbuild.OutputFile;
}
