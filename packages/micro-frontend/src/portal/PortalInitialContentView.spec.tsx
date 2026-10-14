import { createRef, type ReactElement } from 'react';
import { View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';
import { PortalInitialContentProvider, PortalInitialContentView } from './PortalInitialContentView';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

function render(element: ReactElement, node?: object) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element, { createNodeMock: () => node ?? null });
  });
  if (renderer == null) {
    throw new Error('The initial content renderer was not created');
  }
  return renderer;
}

describe('PortalInitialContentView', () => {
  it('declares its own native View without adding a wrapper and forwards View props and ref', () => {
    const ref = createRef<View>();
    const node = { measure: vi.fn() };
    const onLayout = vi.fn();
    const renderer = render(
      <PortalInitialContentProvider request={{ requestKey: 'example/home', revision: 7 }}>
        <PortalInitialContentView
          ref={ref}
          style={{ flex: 1 }}
          accessibilityLabel="initial content"
          onLayout={onLayout}
        >
          <View testID="body" />
        </PortalInitialContentView>
      </PortalInitialContentProvider>,
      node
    );

    expect(renderer.toJSON()).toMatchObject({
      type: 'View',
      props: {
        nativeID: 'granite:portal-initial-content:7:example/home',
        collapsable: false,
        style: { flex: 1 },
        accessibilityLabel: 'initial content',
        onLayout,
      },
      children: [{ type: 'View', props: { testID: 'body' } }],
    });
    expect(ref.current).toBe(node);
    act(() => renderer.unmount());
    expect(ref.current).toBeNull();
  });

  it('is an ordinary View without a request', () => {
    const renderer = render(<PortalInitialContentView testID="standalone" pointerEvents="none" />);
    expect(renderer.toJSON()).toMatchObject({ type: 'View', props: { testID: 'standalone', pointerEvents: 'none' } });
    expect(renderer.root.findByType(View).props.nativeID).toBeUndefined();
    expect(renderer.root.findByType(View).props.collapsable).toBeUndefined();
  });

  it('updates the request and removes its marker when the host disables observation', () => {
    const content = <PortalInitialContentView />;
    const renderer = render(
      <PortalInitialContentProvider request={{ requestKey: 'first', revision: 0 }}>
        {content}
      </PortalInitialContentProvider>
    );
    act(() =>
      renderer.update(
        <PortalInitialContentProvider request={{ requestKey: 'second', revision: 2 }}>
          {content}
        </PortalInitialContentProvider>
      )
    );
    expect(renderer.root.findByType(View).props.nativeID).toBe('granite:portal-initial-content:2:second');
    act(() =>
      renderer.update(<PortalInitialContentProvider request={undefined}>{content}</PortalInitialContentProvider>)
    );
    expect(renderer.root.findByType(View).props.nativeID).toBeUndefined();
    expect(renderer.root.findByType(View).props.collapsable).toBeUndefined();
  });

  it('masks an outer request when an inner host supplies no request', () => {
    const renderer = render(
      <PortalInitialContentProvider request={{ requestKey: 'outer', revision: 0 }}>
        <PortalInitialContentView testID="outer" />
        <PortalInitialContentProvider request={undefined}>
          <PortalInitialContentView testID="hidden" />
        </PortalInitialContentProvider>
      </PortalInitialContentProvider>
    );
    expect(renderer.root.findAllByType(View).map((view) => view.props.nativeID)).toEqual([
      'granite:portal-initial-content:0:outer',
      undefined,
    ]);
  });

  it('owns nativeID and collapsable even when an untyped caller supplies conflicting values', () => {
    const conflictingProps = { testID: 'owned-marker', nativeID: 'other', collapsable: true };
    const renderer = render(
      <PortalInitialContentProvider request={{ requestKey: 'current', revision: 0 }}>
        <PortalInitialContentView {...conflictingProps} />
      </PortalInitialContentProvider>
    );
    expect(renderer.root.findByType(View).props).toMatchObject({
      nativeID: 'granite:portal-initial-content:0:current',
      collapsable: false,
    });
  });

  it('does not declare content until the owner renders the content View', () => {
    const renderer = render(
      <PortalInitialContentProvider request={{ requestKey: 'current', revision: 0 }}>
        {null}
      </PortalInitialContentProvider>
    );
    expect(renderer.toJSON()).toBeNull();
    act(() =>
      renderer.update(
        <PortalInitialContentProvider request={{ requestKey: 'current', revision: 0 }}>
          <PortalInitialContentView>
            <View testID="skeleton" />
          </PortalInitialContentView>
        </PortalInitialContentProvider>
      )
    );
    expect(renderer.root.findAllByType(View)[0]?.props.nativeID).toBe('granite:portal-initial-content:0:current');
  });

  it('validates the host request identity and revision', () => {
    expect(() =>
      render(
        <PortalInitialContentProvider request={{ requestKey: '', revision: 0 }}>
          <PortalInitialContentView />
        </PortalInitialContentProvider>
      )
    ).toThrow('nonempty requestKey');
    for (const revision of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, 2147483648]) {
      expect(() =>
        render(
          <PortalInitialContentProvider request={{ requestKey: 'current', revision }}>
            <PortalInitialContentView />
          </PortalInitialContentProvider>
        )
      ).toThrow('revision to be an integer between 0 and 2147483647');
    }
    const renderer = render(
      <PortalInitialContentProvider request={{ requestKey: 'current', revision: 2147483647 }}>
        <PortalInitialContentView />
      </PortalInitialContentProvider>
    );
    expect(renderer.root.findByType(View).props.nativeID).toBe('granite:portal-initial-content:2147483647:current');
  });
});
