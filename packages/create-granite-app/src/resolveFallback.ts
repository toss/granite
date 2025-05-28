type Argument<T> = T | (() => T | Promise<T>) | null;

export async function resolveFallback<T>(...args: Argument<T>[]): Promise<T> {
  for (const arg of args) {
    if (arg === null) {
      continue;
    }
    if (typeof arg !== 'function') {
      return arg;
    }

    const result = await (arg as () => T | Promise<T>)();
    return result;
  }
  throw new Error('No valid value found');
}
