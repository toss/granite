import type { BuildFailureResult, BuildResult, BuildSuccessResult } from "../types";

export function isBuildSuccess(result: BuildResult): result is BuildSuccessResult {
  return 'bundle' in result;
}

export function isBuildFailure(result: BuildResult): result is BuildFailureResult {
  return !('bundle' in result);
}
