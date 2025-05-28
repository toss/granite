import * as esbuild from 'esbuild';
import type { BuildConfig } from '..';

export type BuildResult = esbuild.BuildResult & {
  tag: string;
  bundle: BundleData;
  outfile: BuildConfig['outfile'];
  sourcemapOutfile: NonNullable<BuildConfig['sourcemapOutfile']>;
  platform: BuildConfig['platform'];
  extra: BuildConfig['extra'];
  totalModuleCount: number;
  duration: number;
  size: number;
};

export interface BundleData {
  source: esbuild.OutputFile;
  sourcemap: esbuild.OutputFile;
}
