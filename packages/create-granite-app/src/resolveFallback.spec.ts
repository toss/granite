import { describe, it, expect } from 'vitest';
import { resolveFallback } from './resolveFallback';

describe('resolveFallback', () => {
  it('should return first valid value', async () => {
    const result = await resolveFallback('first', 'second');
    expect(result).toBe('first');
  });

  it('should skip null values and return first valid value', async () => {
    const result = await resolveFallback(null, 'valid', 'second');
    expect(result).toBe('valid');
  });

  it('should resolve async function and return valid value', async () => {
    const result = await resolveFallback(null, async () => 'valid');
    expect(result).toBe('valid');
  });

  it('should execute function and return its result', async () => {
    const result = await resolveFallback(() => 'function result');
    expect(result).toBe('function result');
  });

  it('should execute async function and return its result', async () => {
    const result = await resolveFallback(async () => 'async result');
    expect(result).toBe('async result');
  });

  it('should throw error when no valid value exists', async () => {
    await expect(resolveFallback(null, null)).rejects.toThrow('No valid value found');
  });
});
