import { createRef, type ReactElement } from 'react';
import { View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortalInitialContentView } from './PortalInitialContentView';
import { MicroFrontendSessionProvider, MissingMicroFrontendSessionError } from '../session/MicroFrontendSessionContext';
import NativeInitialContentView from '../specs/GranitePortalInitialContentViewNativeComponent';

vi.mock('@granite-js/react-native', () => import('../../../react-native/src/visibility/useVisibilityChanged'));

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

const renderers: ReactTestRenderer[] = [];

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
});

function render(element: ReactElement, node?: object) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element, { createNodeMock: () => node ?? null });
  });
  if (renderer == null) {
    throw new Error('The initial content renderer was not created');
  }
  renderers.push(renderer);
  return renderer;
}

describe('PortalInitialContentView', () => {
  it('marks its own View for the current session and forwards View props and ref without another wrapper', () => {
    const ref = createRef<View>();
    const node = { measure: vi.fn() };
    const onLayout = vi.fn();
    const renderer = render(
      <MicroFrontendSessionProvider presentationVisibility={true} sessionId="example/home">
        <PortalInitialContentView
          ref={ref}
          style={{ flex: 1 }}
          accessibilityLabel="initial content"
          accessibilityElementsHidden={true}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          onLayout={onLayout}
        >
          <View testID="body" />
        </PortalInitialContentView>
      </MicroFrontendSessionProvider>,
      node
    );

    expect(renderer.toJSON()).toMatchObject({
      type: 'GranitePortalInitialContentView',
      props: {
        nativeID: 'granite:portal-initial-content:0:example/home',
        collapsable: false,
        style: { flex: 1 },
        accessibilityLabel: 'initial content',
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
        pointerEvents: 'none',
        onLayout,
      },
      children: [
        {
          type: 'View',
          props: {
            nativeID: 'granite:portal-mount-sentinel',
            collapsable: false,
            pointerEvents: 'none',
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants',
            style: { position: 'absolute', width: 0, height: 0 },
          },
        },
        { type: 'View', props: { testID: 'body' } },
      ],
    });
    expect(renderer.root.findAllByType(NativeInitialContentView)).toHaveLength(1);
    expect(renderer.root.findAllByType(View)).toHaveLength(2);
    expect(ref.current).toBe(node);
    act(() => renderer.unmount());
    expect(ref.current).toBeNull();
  });

  it('keeps nested user content after the private sentinel', () => {
    const renderer = render(
      <MicroFrontendSessionProvider presentationVisibility={true} sessionId="nested">
        <PortalInitialContentView>
          <View testID="outer">
            <View testID="inner" />
          </View>
        </PortalInitialContentView>
      </MicroFrontendSessionProvider>
    );
    expect(renderer.toJSON()).toMatchObject({
      children: [
        { props: { nativeID: 'granite:portal-mount-sentinel' } },
        { props: { testID: 'outer' }, children: [{ props: { testID: 'inner' } }] },
      ],
    });
  });

  it('requires the existing session provider', () => {
    expect(() => render(<PortalInitialContentView />)).toThrow(MissingMicroFrontendSessionError);
  });

  it('replaces the marker when the current session changes', () => {
    const renderer = render(
      <MicroFrontendSessionProvider presentationVisibility={true} sessionId="first">
        <PortalInitialContentView />
      </MicroFrontendSessionProvider>
    );
    expect(renderer.root.findByType(NativeInitialContentView).props.nativeID).toBe(
      'granite:portal-initial-content:0:first'
    );

    act(() =>
      renderer.update(
        <MicroFrontendSessionProvider presentationVisibility={true} sessionId="second">
          <PortalInitialContentView />
        </MicroFrontendSessionProvider>
      )
    );
    expect(renderer.root.findByType(NativeInitialContentView).props.nativeID).toBe(
      'granite:portal-initial-content:0:second'
    );
  });

  it('uses the closest session without changing a sibling boundary', () => {
    const renderer = render(
      <MicroFrontendSessionProvider presentationVisibility={true} sessionId="outer">
        <PortalInitialContentView testID="outer" />
        <MicroFrontendSessionProvider presentationVisibility={true} sessionId="inner">
          <PortalInitialContentView testID="inner" />
        </MicroFrontendSessionProvider>
      </MicroFrontendSessionProvider>
    );
    expect(renderer.root.findAllByType(NativeInitialContentView).map((view) => view.props.nativeID)).toEqual([
      'granite:portal-initial-content:0:outer',
      'granite:portal-initial-content:0:inner',
    ]);
  });

  it('owns the native marker even when an untyped caller supplies conflicting View identifiers', () => {
    const conflictingProps = { testID: 'owned-marker', id: 'alias', nativeID: 'other', collapsable: true };
    const renderer = render(
      <MicroFrontendSessionProvider presentationVisibility={true} sessionId="current">
        <PortalInitialContentView {...conflictingProps} />
      </MicroFrontendSessionProvider>
    );
    expect(renderer.root.findByType(NativeInitialContentView).props).toMatchObject({
      nativeID: 'granite:portal-initial-content:0:current',
      collapsable: false,
    });
    expect(renderer.root.findByType(NativeInitialContentView).props.id).toBeUndefined();
  });
});
