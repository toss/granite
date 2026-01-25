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
      'react/jsx-runtime': { eager: true },
      'react-native': { eager: true },
      'react-native/Libraries/NativeComponent/NativeComponentRegistry': { eager: true },
      'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable': { eager: true },
      'react-native/Libraries/NativeComponent/ViewConfigIgnore': { eager: true },
      'react-native/Libraries/ReactNative/RendererProxy': { eager: true },
    });

    expect(intoShared(['react', 'react-native'])).toEqual({
      react: {},
      'react/jsx-runtime': {},
      'react-native': {},
      'react-native/Libraries/NativeComponent/NativeComponentRegistry': {},
      'react-native/Libraries/NativeComponent/NativeComponentRegistryUnstable': {},
      'react-native/Libraries/NativeComponent/ViewConfigIgnore': {},
      'react-native/Libraries/ReactNative/RendererProxy': {},
    });
  });
});
