import type { BuildResult, BuildSuccessResult, BuildFailureResult } from '@granite-js/plugin-core';

export function isBuildSuccess(result: BuildResult): result is BuildSuccessResult {
  return 'bundle' in result;
}

export function isBuildFailure(result: BuildResult): result is BuildFailureResult {
  return !('bundle' in result);
}
