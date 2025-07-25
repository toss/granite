import { vitest, describe, expect, it } from 'vitest';
import { mergeMetro } from './mergeMetro';
import type { MetroConfig } from '../types';

describe('mergeMetro', () => {
  it('should return undefined when both source and target are undefined', () => {
    const result = mergeMetro();
    expect(result).toBeUndefined();
  });

  it('should return undefined when both source and target are null', () => {
    const result = mergeMetro(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('should return target when source is undefined', () => {
    const target: MetroConfig = { middlewares: [] };
    const result = mergeMetro(undefined, target);
    expect(result).toBe(target);
  });

  it('should return source when target is undefined', () => {
    const source: MetroConfig = { middlewares: [] };
    const result = mergeMetro(source, undefined);
    expect(result).toBe(source);
  });

  it('should merge configs with middlewares array concatenation', () => {
    const middleware1 = vitest.fn();
    const middleware2 = vitest.fn();
    const middleware3 = vitest.fn();

    const source: MetroConfig = {
      middlewares: [middleware1, middleware2],
    };
    const target: MetroConfig = {
      middlewares: [middleware3],
    };

    const result = mergeMetro(source, target);

    expect(result).toEqual({
      middlewares: [middleware1, middleware2, middleware3],
      reporter: undefined,
      serializer: undefined,
    });
  });

  it('should handle empty middlewares arrays', () => {
    const source: MetroConfig = { middlewares: [] };
    const target: MetroConfig = { middlewares: [] };

    const result = mergeMetro(source, target);

    expect(result).toEqual({
      middlewares: [],
      resolver: undefined,
      serializer: undefined,
      reporter: undefined,
    });
  });

  it('should handle undefined middlewares in source', () => {
    const middleware1 = vitest.fn();
    const source: MetroConfig = {};
    const target: MetroConfig = { middlewares: [middleware1] };

    const result = mergeMetro(source, target);

    expect(result).toEqual({
      middlewares: [middleware1],
      resolver: undefined,
      serializer: undefined,
      reporter: undefined,
    });
  });

  it('should handle undefined middlewares in target', () => {
    const middleware1 = vitest.fn();
    const source: MetroConfig = { middlewares: [middleware1] };
    const target: MetroConfig = {};

    const result = mergeMetro(source, target);

    expect(result).toEqual({
      middlewares: [middleware1],
      resolver: undefined,
      serializer: undefined,
      reporter: undefined,
    });
  });

  it('should merge all properties from both configs', () => {
    const middleware1 = vitest.fn();
    const middleware2 = vitest.fn();
    const update1 = vitest.fn();
    const update2 = vitest.fn();

    const source: MetroConfig = {
      middlewares: [middleware1],
      resolver: {
        blockList: [/foo/, /bar/],
      },
      serializer: {
        getPolyfills: () => ['./polyfill-1.js'],
      },
      reporter: {
        update: update1,
      },
    };
    const target: MetroConfig = {
      middlewares: [middleware2],
      resolver: {
        blockList: /baz/,
      },
      serializer: {
        getPolyfills: () => ['./polyfill-2.js', './polyfill-3.js'],
      },
      reporter: {
        update: update2,
      },
    };

    const result = mergeMetro(source, target);

    expect(result).toEqual({
      middlewares: [middleware1, middleware2],
      resolver: {
        blockList: [/foo/, /bar/, /baz/],
      },
      serializer: {
        getPolyfills: expect.any(Function),
      },
      reporter: {
        update: expect.any(Function),
      },
    });

    // Serializer
    expect(result?.serializer?.getPolyfills?.()).toEqual(['./polyfill-1.js', './polyfill-2.js', './polyfill-3.js']);

    // Reporter
    result?.reporter?.update?.({} as any);
    expect(update1).toHaveBeenCalledTimes(1);
    expect(update2).toHaveBeenCalledTimes(1);
  });
});
