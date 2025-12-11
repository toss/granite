import { describe, expect, it } from 'vitest';
import { mergeBabel } from './mergeBabel';
import type { BabelRule } from '../types';

describe('mergeBabel', () => {
  const createRule = (name: string): BabelRule => ({
    if: ({ path }) => path.includes(name),
    plugins: [`${name}-plugin`],
  });

  it('returns undefined when both source and target are undefined', () => {
    const result = mergeBabel(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('returns target when source is undefined', () => {
    const rule = createRule('foo');
    const target = { rules: [rule] };
    const result = mergeBabel(undefined, target);
    expect(result).toEqual(target);
  });

  it('returns source when target is undefined', () => {
    const rule = createRule('foo');
    const source = { rules: [rule] };
    const result = mergeBabel(source, undefined);
    expect(result).toEqual(source);
  });

  it('merges rules arrays', () => {
    const rule1 = createRule('foo');
    const rule2 = createRule('bar');
    const source = { rules: [rule1] };
    const target = { rules: [rule2] };
    const result = mergeBabel(source, target);

    expect(result?.rules).toHaveLength(2);
    expect(result?.rules).toContain(rule1);
    expect(result?.rules).toContain(rule2);
  });

  it('handles empty rules arrays gracefully', () => {
    const rule = createRule('foo');
    const source = { rules: [rule] };
    const target = { rules: [] };
    const result = mergeBabel(source, target);

    expect(result?.rules).toEqual([rule]);
  });

  it('handles missing rules property gracefully', () => {
    const rule = createRule('foo');
    const source = { rules: [rule] };
    const target = {};
    const result = mergeBabel(source, target);

    expect(result?.rules).toEqual([rule]);
  });
});
