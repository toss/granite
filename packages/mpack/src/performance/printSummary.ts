import chalk from 'chalk';
import { PerfStatic } from './Performance';

export interface PrintSummaryOptions {
  limit?: number;
}

export function printSummary(
  summary: NonNullable<ReturnType<PerfStatic['getSummary']>>,
  options?: PrintSummaryOptions
) {
  const { limit = 30 } = options ?? {};

  Object.entries(summary).forEach(([category, result]) => {
    const records = result.records.sort((a, b) => b.duration - a.duration).slice(0, limit);

    console.log(
      `╭─ Performance mark: ${chalk.blue.bold(category)} ${chalk.gray(`(Average duration: ${normalizeDuration(result.averageDuration)}ms)`)}`
    );

    records.forEach(({ sequence, duration, detail }, index) => {
      console.log(`│ ${chalk.cyan(`Record #${index + 1}`)} (Duration: ${normalizeDuration(duration)}ms)`);
      Object.entries(detail ?? {}).forEach(([key, value]) => {
        console.log(`│ ├─ ${chalk.gray(`${key}: ${value}`)}`);
      });
      console.log(`│ ╰─ Sequence: ${sequence}`);
    });

    console.log(`╰─ Total records: ${result.records.length}`);
  });
}

function normalizeDuration(duration: number) {
  return duration.toFixed(8);
}
