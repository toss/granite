import { afterEach, describe, expect, it } from 'vitest';
import { isMonoHermes } from './monoHermes';

describe('isMonoHermes', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
  });

  it('returns false when the micro-frontend runtime is not initialized', () => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');

    expect(isMonoHermes()).toBe(false);
  });
});
