import { describe, expect, it } from 'vitest';
import { mergeBabel } from './mergeBabel';

describe('mergeBabel', () => {
  it('returns undefined when both source and target are undefined', () => {
    const result = mergeBabel(undefined, undefined);
    expect(result).toBeUndefined();
  });

  it('returns target when source is undefined', () => {
    const target = { presets: ['preset1'] };
    const result = mergeBabel(undefined, target);
    expect(result).toEqual(target);
  });

  it('returns source when target is undefined', () => {
    const source = { presets: ['preset1'] };
    const result = mergeBabel(source, undefined);
    expect(result).toEqual(source);
  });

  it('merges presets arrays', () => {
    const source = { presets: ['preset1'] };
    const target = { presets: ['preset2'] };
    const result = mergeBabel(source, target);

    expect(result?.presets).toEqual(['preset1', 'preset2']);
  });

  it('merges plugins arrays', () => {
    const source = { plugins: ['plugin1'] };
    const target = { plugins: ['plugin2'] };
    const result = mergeBabel(source, target);

    expect(result?.plugins).toEqual(['plugin1', 'plugin2']);
  });

  it('handles missing arrays gracefully', () => {
    const source = { presets: ['preset1'] };
    const target = { plugins: ['plugin1'] };
    const result = mergeBabel(source, target);

    expect(result?.presets).toEqual(['preset1']);
    expect(result?.plugins).toEqual(['plugin1']);
  });

  it('overrides scalar properties', () => {
    const source = { configFile: 'babel.config.js' };
    const target = { configFile: 'babel.config.json' };
    const result = mergeBabel(source, target);

    expect(result?.configFile).toBe('babel.config.json');
  });

  it('performs complete merge with all properties', () => {
    const source = {
      configFile: 'babel.config.js',
      presets: ['preset1'],
      plugins: ['plugin1'],
    };

    const target = {
      configFile: 'babel.config.json',
      presets: ['preset2'],
      plugins: ['plugin2'],
    };

    const result = mergeBabel(source, target);

    expect(result).toEqual({
      configFile: 'babel.config.json',
      presets: ['preset1', 'preset2'],
      plugins: ['plugin1', 'plugin2'],
    });
  });
});
