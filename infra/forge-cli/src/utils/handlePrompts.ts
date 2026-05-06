import * as p from '@clack/prompts';

type Task = (...args: any[]) => unknown;

export function handlePrompts<T extends Task>(
  title: string,
  task: T
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    p.intro(title);

    try {
      return (await task.call(null, ...args)) as Awaited<ReturnType<T>>;
    } catch (error) {
      promptErrorHandler(error);
    }
  };
}

function promptErrorHandler(error: unknown): never {
  p.log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
