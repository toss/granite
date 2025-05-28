import * as p from '@clack/prompts';

export function handlePrompts<T extends (...args: any[]) => any>(title: string, task: T) {
  return (...args: Parameters<T>) => {
    p.intro(title);

    try {
      const result = task.call(null, ...args);

      if (result instanceof Promise) {
        result.catch(promptErrorHandler);
      }
    } catch (error) {
      promptErrorHandler(error);
    }
  };
}

function promptErrorHandler(error: unknown) {
  p.log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
