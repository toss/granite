import { getExecutionContext, type ExecutionContext } from './context';

/** Target for the compiler's async-to-generator module/method integration. */
export function createAsyncToGenerator(context: ExecutionContext) {
  return function asyncToGenerator<TThis, TArgs extends unknown[], TResult>(
    factory: (this: TThis, ...args: TArgs) => Generator<unknown, TResult, unknown>
  ): (this: TThis, ...args: TArgs) => Promise<TResult> {
    return function (this: TThis, ...args: TArgs): Promise<TResult> {
      const snapshot = context.snapshot();
      return new Promise<TResult>((resolve, reject) => {
        let iterator: Generator<unknown, TResult, unknown>;
        try {
          iterator = snapshot.run(() => factory.apply(this, args));
        } catch (error) {
          reject(error);
          return;
        }

        function resume(method: 'next' | 'throw', value?: unknown): void {
          let step: IteratorResult<unknown, TResult>;
          try {
            step = snapshot.run(() => iterator[method](value));
          } catch (error) {
            reject(error);
            return;
          }

          if (step.done) {
            resolve(step.value);
          } else {
            Promise.resolve(step.value).then(
              (result) => resume('next', result),
              (error) => resume('throw', error)
            );
          }
        }

        resume('next');
      });
    };
  };
}

export function asyncToGenerator<TThis, TArgs extends unknown[], TResult>(
  factory: (this: TThis, ...args: TArgs) => Generator<unknown, TResult, unknown>
): (this: TThis, ...args: TArgs) => Promise<TResult> {
  return createAsyncToGenerator(getExecutionContext())(factory);
}
