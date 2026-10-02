import chalk from 'chalk';
import { ExitCode } from '../constants';

export function errorHandler(error: unknown) {
  const label = chalk.red('Error');
  const seen = new Set<unknown>();

  function printError(error: unknown) {
    if (seen.has(error)) {
      return;
    }
    seen.add(error);

    if (error instanceof Error) {
      console.error(label, error.message);
      if (error instanceof AggregateError) {
        for (const reason of error.errors) {
          printError(reason);
        }
      }
      if (error.cause !== undefined) {
        printError(error.cause);
      }
    } else {
      console.error(label, 'Unknown error', error ?? '');
    }
  }

  printError(error);
  return ExitCode.ERROR;
}
