import { vitest, describe, expect, it } from 'vitest';
import { mergeResolver } from './mergeResolver';

describe('mergeResolver', () => {
  it('returns undefined when both source and target are undefined', () => {
    const result = mergeResolver(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('returns target when source is undefined', () => {
    const target = { alias: [{ from: 'a', to: 'b' }] };
    const result = mergeResolver(undefined, target);
    expect(result).toEqual(target);
  });

  it('returns source when target is undefined', () => {
    const source = { alias: [{ from: 'a', to: 'b' }] };
    const result = mergeResolver(source, undefined);
    expect(result).toEqual(source);
  });

  it('merges alias arrays', () => {
    const source = { alias: [{ from: 'src', to: './src' }] };
    const target = { alias: [{ from: 'utils', to: './utils' }] };
    const result = mergeResolver(source, target);

    expect(result?.alias).toHaveLength(2);
    expect(result?.alias).toContainEqual({ from: 'src', to: './src' });
    expect(result?.alias).toContainEqual({ from: 'utils', to: './utils' });
  });

  it('merges protocols objects', () => {
    const mockLoad = vitest.fn();
    const mockResolve = vitest.fn();

    const source = {
      protocols: {
        custom1: { load: mockLoad },
      },
    };
    const target = {
      protocols: {
        custom2: { load: mockLoad, resolve: mockResolve },
      },
    };
    const result = mergeResolver(source, target);

    expect(result?.protocols).toHaveProperty('custom1');
    expect(result?.protocols).toHaveProperty('custom2');
    expect(result?.protocols?.['custom1']?.load).toBe(mockLoad);
    expect(result?.protocols?.['custom2']?.resolve).toBe(mockResolve);
  });

  it('handles missing properties gracefully', () => {
    const source = { alias: [{ from: 'src', to: './src' }] };
    const target = { protocols: { custom: { load: vitest.fn() } } };
    const result = mergeResolver(source, target);

    expect(result?.alias).toEqual([{ from: 'src', to: './src' }]);
    expect(result?.protocols).toEqual({ custom: { load: expect.any(Function) } });
  });

  it('handles empty arrays and objects', () => {
    const source = { alias: [], protocols: {} };
    const target = { alias: [{ from: 'utils', to: './utils' }] };
    const result = mergeResolver(source, target);

    expect(result?.alias).toEqual([{ from: 'utils', to: './utils' }]);
    expect(result?.protocols).toEqual({});
  });

  it('overwrites protocols with same key', () => {
    const mockLoad1 = vitest.fn();
    const mockLoad2 = vitest.fn();

    const source = { protocols: { custom: { load: mockLoad1 } } };
    const target = { protocols: { custom: { load: mockLoad2 } } };
    const result = mergeResolver(source, target);

    expect(result?.protocols?.['custom']?.load).toBe(mockLoad2);
  });
});
