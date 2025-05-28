import type { ProcessOutput } from 'zx';

export async function ensureExecuteCommand(task: Promise<ProcessOutput>) {
  const result = await task;

  if (result.exitCode !== 0) {
    throw result.cause;
  }

  return result;
}
