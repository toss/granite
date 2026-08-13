import { describe, expect, it } from 'vitest';
import { intoShared } from './intoShared';

describe('intoShared', () => {
  it('expands React and React Native subpaths with the parent configuration', () => {
    // Given
    const shared = {
      react: { eager: true },
      'react-native': {},
    } as const;

    // When
    const normalized = intoShared(shared);

    // Then
    expect(normalized?.react).toEqual({ eager: true });
    expect(normalized?.['react/jsx-runtime']).toEqual({ eager: true });
    expect(normalized?.['react-native']).toEqual({});
    expect(normalized?.['react-native/Libraries/TurboModule/TurboModuleRegistry']).toEqual({});
  });
});
