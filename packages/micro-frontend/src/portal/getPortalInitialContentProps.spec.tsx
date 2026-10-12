import type { ReactElement } from 'react';
import { View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it } from 'vitest';
import { getPortalInitialContentProps } from './getPortalInitialContentProps';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

function render(element: ReactElement) {
  let renderer: ReactTestRenderer | undefined;

  act(() => {
    renderer = create(element);
  });
  if (renderer == null) {
    throw new Error('The portal initial content props renderer was not created');
  }

  return renderer;
}

describe('getPortalInitialContentProps', () => {
  it('marks an existing native View when the caller spreads the helper last', () => {
    const consumerProps = {
      collapsable: true,
      nativeID: 'consumer-marker',
    };
    const renderer = render(
      <View
        accessibilityLabel="initial content"
        {...consumerProps}
        {...getPortalInitialContentProps({ ready: true, requestKey: 'store/home', revision: 7 })}
      >
        <View style={{ backgroundColor: 'blue', height: 24 }} />
      </View>
    );

    expect(renderer.toJSON()).toMatchObject({
      children: [{ props: { style: { backgroundColor: 'blue', height: 24 } }, type: 'View' }],
      props: {
        accessibilityLabel: 'initial content',
        collapsable: false,
        nativeID: 'granite:portal-initial-content:7:store/home',
      },
      type: 'View',
    });
  });

  it('removes the marker when ready changes from true to false', () => {
    const renderer = render(
      <View {...getPortalInitialContentProps({ ready: true, requestKey: 'store/home', revision: 7 })}>
        <View style={{ backgroundColor: 'blue', height: 24 }} />
      </View>
    );

    act(() => {
      renderer.update(
        <View {...getPortalInitialContentProps({ ready: false, requestKey: 'store/home', revision: 7 })}>
          <View style={{ backgroundColor: 'blue', height: 24 }} />
        </View>
      );
    });

    expect(renderer.toJSON()).toMatchObject({
      props: {
        collapsable: false,
        nativeID: undefined,
      },
    });
  });

  it('reflects request key and revision independently in the marker protocol', () => {
    expect(
      getPortalInitialContentProps({ ready: true, requestKey: 'store/detail', revision: 7 }).nativeID
    ).toBe('granite:portal-initial-content:7:store/detail');
    expect(
      getPortalInitialContentProps({ ready: true, requestKey: '상품:추천', revision: 8 }).nativeID
    ).toBe('granite:portal-initial-content:8:상품:추천');
  });

  it('validates request, revision, and ready boundary values at runtime', () => {
    expect(getPortalInitialContentProps({ ready: true, requestKey: 'store/home', revision: 2147483647 })).toEqual({
      collapsable: false,
      nativeID: 'granite:portal-initial-content:2147483647:store/home',
    });

    expect(() => getPortalInitialContentProps({ ready: true, requestKey: '', revision: 0 })).toThrow(
      'getPortalInitialContentProps requires a nonempty requestKey'
    );
    for (const revision of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 2147483648]) {
      expect(() => getPortalInitialContentProps({ ready: true, requestKey: 'store/home', revision })).toThrow(
        'getPortalInitialContentProps requires revision to be an integer between 0 and 2147483647'
      );
    }
    expect(() =>
      getPortalInitialContentProps({ ready: {} as boolean, requestKey: 'store/home', revision: 0 })
    ).toThrow('getPortalInitialContentProps requires ready to be a boolean');
  });
});
