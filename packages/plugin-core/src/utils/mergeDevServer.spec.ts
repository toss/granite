import { describe, expect, it, vitest } from 'vitest';
import { mergeDevServer } from './mergeDevServer';

describe('mergeDevServer', () => {
  it('should merge dev server configs', () => {
    const middleware1 = vitest.fn();
    const middleware2 = vitest.fn();
    const middleware3 = vitest.fn();

    const source = { middlewares: [middleware1, middleware2] };
    const target = { middlewares: [middleware3] };
    const result = mergeDevServer(source, target);

    expect(result).toEqual({
      middlewares: [middleware1, middleware2, middleware3],
    });
  });
});
