import { vitest, describe, expect, it } from 'vitest';
import { mergeTransformer } from './mergeTransformer';

describe('mergeTransformer', () => {
  it('returns undefined when both source and target are undefined', () => {
    const result = mergeTransformer(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('returns target when source is undefined', () => {
    const mockTransform = vitest.fn();
    const target = { transformSync: mockTransform };
    const result = mergeTransformer(undefined, target);
    expect(result).toEqual(target);
  });

  it('returns source when target is undefined', () => {
    const mockTransform = vitest.fn();
    const source = { transformSync: mockTransform };
    const result = mergeTransformer(source, undefined);
    expect(result).toEqual(source);
  });

  it('creates chained transformer functions when both source and target have transformSync', () => {
    const mockTransformSync1 = vitest.fn((_id: string, code: string) => `transformed1(${code})`);
    const mockTransformSync2 = vitest.fn((_id: string, code: string) => `transformed2(${code})`);

    const source = { transformSync: mockTransformSync1 };
    const target = { transformSync: mockTransformSync2 };
    const result = mergeTransformer(source, target);

    const output = result?.transformSync?.('test.js', 'original code');

    expect(mockTransformSync1).toHaveBeenCalledWith('test.js', 'original code');
    expect(mockTransformSync2).toHaveBeenCalledWith('test.js', 'transformed1(original code)');
    expect(output).toBe('transformed2(transformed1(original code))');
  });

  it('creates chained async transformer functions when both source and target have transformAsync', async () => {
    const mockTransformAsync1 = vitest.fn(async (_id: string, code: string) => `asyncTransformed1(${code})`);
    const mockTransformAsync2 = vitest.fn(async (_id: string, code: string) => `asyncTransformed2(${code})`);

    const source = { transformAsync: mockTransformAsync1 };
    const target = { transformAsync: mockTransformAsync2 };
    const result = mergeTransformer(source, target);

    const output = await result?.transformAsync?.('test.js', 'original code');

    expect(mockTransformAsync1).toHaveBeenCalledWith('test.js', 'original code');
    expect(mockTransformAsync2).toHaveBeenCalledWith('test.js', 'asyncTransformed1(original code)');
    expect(output).toBe('asyncTransformed2(asyncTransformed1(original code))');
  });

  it('uses target transformSync when source has no transformSync', () => {
    const mockTransformSync = vitest.fn((_id: string, code: string) => `transformed(${code})`);

    const source = {};
    const target = { transformSync: mockTransformSync };
    const result = mergeTransformer(source, target);

    expect(result?.transformSync).toBe(mockTransformSync);
  });

  it('uses source transformSync when target has no transformSync', () => {
    const mockTransformSync = vitest.fn((_id: string, code: string) => `transformed(${code})`);

    const source = { transformSync: mockTransformSync };
    const target = {};
    const result = mergeTransformer(source, target);

    expect(result?.transformSync).toBe(mockTransformSync);
  });

  it('uses target transformAsync when source has no transformAsync', async () => {
    const mockTransformAsync = vitest.fn(async (_id: string, code: string) => `asyncTransformed(${code})`);

    const source = {};
    const target = { transformAsync: mockTransformAsync };
    const result = mergeTransformer(source, target);

    expect(result?.transformAsync).toBe(mockTransformAsync);
  });

  it('uses source transformAsync when target has no transformAsync', async () => {
    const mockTransformAsync = vitest.fn(async (_id: string, code: string) => `asyncTransformed(${code})`);

    const source = { transformAsync: mockTransformAsync };
    const target = {};
    const result = mergeTransformer(source, target);

    expect(result?.transformAsync).toBe(mockTransformAsync);
  });

  it('returns undefined for transformSync when neither source nor target have it', () => {
    const source = {};
    const target = {};
    const result = mergeTransformer(source, target);

    expect(result?.transformSync).toBeUndefined();
  });

  it('returns undefined for transformAsync when neither source nor target have it', () => {
    const source = {};
    const target = {};
    const result = mergeTransformer(source, target);

    expect(result?.transformAsync).toBeUndefined();
  });

  it('preserves original code when chained transforms return undefined', () => {
    const mockTransformSync1 = vitest.fn(() => undefined as any);
    const mockTransformSync2 = vitest.fn(() => undefined as any);

    const source = { transformSync: mockTransformSync1 };
    const target = { transformSync: mockTransformSync2 };
    const result = mergeTransformer(source, target);

    const output = result?.transformSync?.('test.js', 'original code');

    expect(output).toBe('original code');
  });

  it('preserves original code when chained async transforms return undefined', async () => {
    const mockTransformAsync1 = vitest.fn(async () => undefined as any);
    const mockTransformAsync2 = vitest.fn(async () => undefined as any);

    const source = { transformAsync: mockTransformAsync1 };
    const target = { transformAsync: mockTransformAsync2 };
    const result = mergeTransformer(source, target);

    const output = await result?.transformAsync?.('test.js', 'original code');

    expect(output).toBe('original code');
  });

  it('handles mixed sync and async transformations independently', async () => {
    const mockTransformSync = vitest.fn((_id: string, code: string) => `sync(${code})`);
    const mockTransformAsync = vitest.fn(async (_id: string, code: string) => `async(${code})`);

    const source = { transformSync: mockTransformSync };
    const target = { transformAsync: mockTransformAsync };
    const result = mergeTransformer(source, target);

    expect(result?.transformSync).toBe(mockTransformSync);
    expect(result?.transformAsync).toBe(mockTransformAsync);
  });

  it('creates complete transformer object with both sync and async functions', () => {
    const mockTransformSync1 = vitest.fn((_id: string, code: string) => `sync1(${code})`);
    const mockTransformSync2 = vitest.fn((_id: string, code: string) => `sync2(${code})`);
    const mockTransformAsync1 = vitest.fn(async (_id: string, code: string) => `async1(${code})`);
    const mockTransformAsync2 = vitest.fn(async (_id: string, code: string) => `async2(${code})`);

    const source = {
      transformSync: mockTransformSync1,
      transformAsync: mockTransformAsync1,
    };
    const target = {
      transformSync: mockTransformSync2,
      transformAsync: mockTransformAsync2,
    };
    const result = mergeTransformer(source, target);

    expect(result?.transformSync).toBeDefined();
    expect(result?.transformAsync).toBeDefined();

    // Test that both chaining works
    const syncOutput = result?.transformSync?.('test.js', 'code');
    expect(syncOutput).toBe('sync2(sync1(code))');
  });
});
