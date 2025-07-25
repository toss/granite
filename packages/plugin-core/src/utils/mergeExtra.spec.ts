import { describe, expect, it } from 'vitest';
import { mergeExtra } from './mergeExtra';

describe('mergeExtra', () => {
  it('should return undefined when both source and target are undefined', () => {
    const result = mergeExtra(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('should return target when source is undefined', () => {
    const target = { a: 1 };
    const result = mergeExtra(undefined, target);
    expect(result).toBe(target);
  });

  it('should return source when target is undefined', () => {
    const source = { a: 1 };
    const result = mergeExtra(source, undefined);
    expect(result).toBe(source);
  });

  it('should merge objects', () => {
    const source = { a: 1 };
    const target = { b: 2 };
    const result = mergeExtra(source, target);
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
