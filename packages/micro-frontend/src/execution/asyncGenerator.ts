import { getExecutionContext, type ExecutionSnapshot } from './context';

/** Matches Babel's OverloadYield helper contract for await and delegated yield. */
export class AsyncGeneratorYield {
  constructor(readonly v: unknown, readonly k: number) {}
}

type Operation = 'next' | 'throw' | 'return';
interface Request {
  readonly operation: Operation;
  readonly value: unknown;
  readonly execution: ExecutionSnapshot;
  readonly resolve: (value: IteratorResult<unknown>) => void;
  readonly reject: (reason: unknown) => void;
}

/** Each queued request owns its resumes, including when another caller is already awaiting a value. */
export function wrapAsyncGenerator<TThis, TArgs extends unknown[]>(
  factory: (this: TThis, ...args: TArgs) => Generator<unknown, unknown, unknown>
): (this: TThis, ...args: TArgs) => AsyncIterableIterator<unknown> {
  return function (this: TThis, ...args: TArgs): AsyncIterableIterator<unknown> {
    const generator = factory.apply(this, args);
    const requests: Request[] = [];

    function settle(result: IteratorResult<unknown> | null, error?: unknown): void {
      const request = requests.shift();
      if (request == null) {throw new Error('Async generator completed without a request');}
      if (result == null) {request.reject(error);}
      else {request.resolve(result);}
      const next = requests[0];
      if (next != null) {resume(next.operation, next.value);}
    }

    function resume(operation: Operation, value: unknown): void {
      const request = requests[0];
      if (request == null) {throw new Error('Async generator resumed without a request');}
      request.execution.run(() => {
        try {
          const result = generator[operation](value);
          const yielded = result.value;
          const overloaded = yielded instanceof AsyncGeneratorYield;
          Promise.resolve(overloaded ? yielded.v : yielded).then(
            (resolved) => request.execution.run(() => {
              if (overloaded) {
                const continuation = yielded.k !== 0 && operation === 'return' ? 'return' : 'next';
                const delegatedDone = typeof resolved === 'object' && resolved != null && Reflect.get(resolved, 'done');
                if (yielded.k === 0 || delegatedDone) {
                  resume(continuation, resolved);
                  return;
                }
                // The delegation adapter consumes its resolved IteratorResult synchronously.
                try {
                  resolved = generator[continuation](resolved).value;
                } catch (error) {
                  settle(null, error);
                  return;
                }
              }
              settle({ value: resolved, done: result.done === true });
            }),
            (error: unknown) => resume('throw', error)
          );
        } catch (error) {
          settle(null, error);
        }
      });
    }

    function invoke(operation: Operation, value?: unknown): Promise<IteratorResult<unknown>> {
      const execution = getExecutionContext().snapshot();
      return new Promise((resolve, reject) => {
        requests.push({ operation, value, execution, resolve, reject });
        if (requests.length === 1) {resume(operation, value);}
      });
    }

    return {
      next: (value?: unknown) => invoke('next', value),
      throw: (error?: unknown) => invoke('throw', error),
      return: (value?: unknown) => invoke('return', value),
      [Symbol.asyncIterator]() { return this; },
    };
  };
}
