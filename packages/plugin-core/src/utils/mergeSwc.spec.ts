import { describe, expect, it } from 'vitest';
import { mergeSwc } from './mergeSwc';

describe('mergeSwc', () => {
  it('returns undefined when both source and target are undefined', () => {
    const result = mergeSwc(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('returns target when source is undefined', () => {
    const target = { plugins: [['plugin1', {}]] as any[] };
    const result = mergeSwc(undefined, target);
    expect(result).toEqual(target);
  });

  it('returns source when target is undefined', () => {
    const source = { plugins: [['plugin1', {}]] as any[] };
    const result = mergeSwc(source, undefined);
    expect(result).toEqual(source);
  });

  it('merges plugins arrays', () => {
    const source = { plugins: [['plugin1', { option: 1 }]] as any[] };
    const target = { plugins: [['plugin2', { option: 2 }]] as any[] };
    const result = mergeSwc(source, target);

    expect(result?.plugins).toHaveLength(2);
    expect(result?.plugins).toContainEqual(['plugin1', { option: 1 }]);
    expect(result?.plugins).toContainEqual(['plugin2', { option: 2 }]);
  });

  it('handles missing plugins arrays', () => {
    const source = { customOption: 'value' } as any;
    const target = { plugins: [['plugin1', {}]] as any[] };
    const result = mergeSwc(source, target);

    expect(result?.plugins).toEqual([['plugin1', {}]]);
    expect((result as any)?.customOption).toBe('value');
  });

  it('handles empty plugins arrays', () => {
    const source = { plugins: [] as any[] };
    const target = { plugins: [['plugin1', {}]] as any[] };
    const result = mergeSwc(source, target);

    expect(result?.plugins).toEqual([['plugin1', {}]]);
  });

  it('preserves other SwcConfig properties', () => {
    const source = {
      plugins: [['plugin1', {}]],
      customProperty: 'source-value',
    } as any;
    const target = {
      plugins: [['plugin2', {}]],
      anotherProperty: 'target-value',
    } as any;
    const result = mergeSwc(source, target);

    expect(result?.plugins).toHaveLength(2);
    expect((result as any)?.customProperty).toBe('source-value');
    expect((result as any)?.anotherProperty).toBe('target-value');
  });

  it('handles complex plugin configurations', () => {
    const source = {
      plugins: [
        [
          '@swc/plugin-transform-imports',
          {
            lodash: { transform: 'lodash/${member}' },
          },
        ],
      ] as any[],
    };
    const target = {
      plugins: [
        [
          '@swc/plugin-styled-components',
          {
            displayName: true,
          },
        ],
      ] as any[],
    };
    const result = mergeSwc(source, target);

    expect(result?.plugins).toHaveLength(2);
    expect(result?.plugins).toContainEqual([
      '@swc/plugin-transform-imports',
      { lodash: { transform: 'lodash/${member}' } },
    ]);
    expect(result?.plugins).toContainEqual(['@swc/plugin-styled-components', { displayName: true }]);
  });
});
