import type { BuildResult, BuildSuccessResult } from '@granite-js/plugin-core';

export function isBuildSuccess(result: BuildResult): result is BuildSuccessResult {
  return 'bundle' in result;
}
