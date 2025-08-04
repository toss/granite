import chalk from 'chalk';
import { ExitCode } from '../constants';

export function errorHandler(error: unknown) {
  const label = chalk.red('Error');

  if (error instanceof Error) {
    console.error(label, error.message);
  } else {
    console.error(label, 'Unknown error', (error ?? '')?.toString());
  }

  return ExitCode.ERROR;
}
