import chalk from 'chalk';
import { formatMessages, Message } from 'esbuild';
import { logger } from '../logger';

export function printSummary<
  Result extends {
    warnings: Message[];
    errors: Message[];
    totalModuleCount: number;
    duration: number;
  },
>({ warnings, errors, totalModuleCount, duration }: Result) {
  return Promise.all([formatMessages(warnings, { kind: 'warning' }), formatMessages(errors, { kind: 'error' })]).then(
    ([warnings, errors]) => {
      warnings.forEach((message) => logger.warn('\n\n', message));
      errors.forEach((message) => logger.error('\n\n', message));

      const durations = chalk.underline(`${totalModuleCount} Modules (${(duration / 1000).toFixed(2)}s)`);
      const summary = [
        durations,
        `${chalk.red(errors.length)} errors`,
        `${chalk.yellow(warnings.length)} warnings`,
      ].join(chalk.white(' | '));

      logger.info(chalk.gray(summary));
    }
  );
}
