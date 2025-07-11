import { describe, expect, it } from 'vitest';
import { intoShared } from './intoShared';

describe('intoShared', () => {
  it('basic cases', () => {
    expect(intoShared(undefined)).toBeUndefined();

    expect(
      intoShared({
        react: {
          eager: true,
        },
        'react-native': {
          eager: true,
        },
      })
    ).toEqual({
      react: { eager: true },
      'react-native': { eager: true },
    });

    expect(intoShared(['react', 'react-native'])).toEqual({
      react: {},
      'react-native': {},
    });
  });
});
