import type * as esbuild from 'esbuild';

// Shared result shape consumed by Granite build commands.
export interface BuildSuccessResult extends esbuild.BuildResult {
  bundle: { source: esbuild.OutputFile; sourcemap: esbuild.OutputFile };
  outfile: string;
  sourcemapOutfile: string;
  platform: 'android' | 'ios';
  extra: any;
  totalModuleCount: number;
  duration: number;
  size: number;
}

export interface BuildFailureResult extends esbuild.BuildResult {
  platform: 'android' | 'ios';
  extra: any;
  duration: number;
}

export type BuildResult = BuildSuccessResult | BuildFailureResult;

export function isBuildSuccess(result: BuildResult): result is BuildSuccessResult {
  return 'bundle' in result;
}

export function isBuildFailure(result: BuildResult): result is BuildFailureResult {
  return !isBuildSuccess(result);
}
