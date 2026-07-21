import { afterEach, describe, expect, it } from 'vitest';
import { setupSharedRuntime } from './setupSharedRuntime';

describe('setupSharedRuntime', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  });

  it('initializes the runtime and registers shared modules', () => {
    const react = { version: 'test' };

    const runtime = setupSharedRuntime({ react });

    expect(runtime.__INSTANCES__).toEqual([]);
    expect(runtime.__SHARED__.react?.get()).toEqual(react);
  });

  it('keeps modules registered by a production prelude', () => {
    const productionReact = { version: 'production' };
    globalThis.__MICRO_FRONTEND__ = {
      __INSTANCES__: [] as unknown as typeof globalThis.__MICRO_FRONTEND__.__INSTANCES__,
      __SHARED__: {
        react: { get: () => productionReact, loaded: true },
      },
    };

    setupSharedRuntime({ react: { version: 'development' } });

    expect(globalThis.__MICRO_FRONTEND__.__SHARED__.react?.get()).toBe(productionReact);
  });
});
