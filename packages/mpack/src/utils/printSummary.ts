import type { BuildResult } from '@granite-js/plugin-core';
import chalk from 'chalk';
import { isNotNil } from 'es-toolkit';
import { formatMessages } from 'esbuild';
import { logger } from '../logger';
import { isBuildSuccess } from './buildResult';

export function printSummary(buildResult: BuildResult) {
  return Promise.all([
    formatMessages(buildResult.warnings, { kind: 'warning', color: true }),
    formatMessages(buildResult.errors, { kind: 'error', color: true }),
  ]).then(([warnings, errors]) => {
    warnings.forEach((message) => console.warn('\n\n', message));
    errors.forEach((message) => console.error('\n\n', message));

    const platform = `[${buildResult.platform}]`;
    const moduleCountAndDuration = isBuildSuccess(buildResult)
      ? chalk.underline(`${buildResult.totalModuleCount} Modules (${(buildResult.duration / 1000).toFixed(2)}s)`)
      : null;

    const summary = [
      platform,
      moduleCountAndDuration,
      `${chalk.red(errors.length)} errors`,
      `${chalk.yellow(warnings.length)} warnings`,
    ]
      .filter(isNotNil)
      .join(chalk.white(' | '));

    logger.info(chalk.gray(summary));
  });
}
