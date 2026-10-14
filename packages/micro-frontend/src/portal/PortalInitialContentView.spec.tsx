import { Component, createRef, lazy, useEffect, type ComponentType, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalInitialContentView } from './PortalInitialContentView';
import {
  hidePendingHostComponent,
  registerPendingHostComponentRoute,
  resetPendingHostComponentStoreForTest,
} from '../host/pendingHostComponentStore';
import { MicroFrontendSessionProvider, MissingMicroFrontendSessionError } from '../session/MicroFrontendSessionContext';

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
      type: 'View',
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
      children: [{ type: 'View', props: { testID: 'body' } }],
    });
    expect(renderer.root.findAllByType(View)).toHaveLength(2);
    expect(ref.current).toBe(node);
    act(() => renderer.unmount());
    expect(ref.current).toBeNull();
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
    expect(renderer.root.findByType(View).props.nativeID).toBe('granite:portal-initial-content:0:first');

    act(() =>
      renderer.update(
        <MicroFrontendSessionProvider presentationVisibility={true} sessionId="second">
          <PortalInitialContentView />
        </MicroFrontendSessionProvider>
      )
    );
    expect(renderer.root.findByType(View).props.nativeID).toBe('granite:portal-initial-content:0:second');
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
    expect(renderer.root.findAllByType(View).map((view) => view.props.nativeID)).toEqual([
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
    expect(renderer.root.findByType(View).props).toMatchObject({
      nativeID: 'granite:portal-initial-content:0:current',
      collapsable: false,
    });
    expect(renderer.root.findByType(View).props.id).toBeUndefined();
  });
});

const pendingUrl = 'granite://host/example/product?count=2';
const sessionMarker = 'granite:portal-initial-content:0:current';

function registerPending(component: (props: { count: number }) => ReactNode) {
  registerPendingHostComponentRoute('/product', {
    app: { name: 'example', scheme: 'granite', host: 'host' },
    component,
  });
}

function session(children: ReactNode) {
  return (
    <MicroFrontendSessionProvider presentationVisibility={true} sessionId="current">
      {children}
    </MicroFrontendSessionProvider>
  );
}

function markedViews(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType(View).filter((view) => view.props.nativeID === sessionMarker);
}

class ContentErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      <PortalInitialContentView testID="error-boundary">
        <View testID="error-content" />
      </PortalInitialContentView>
    ) : (
      this.props.children
    );
  }
}

describe('PortalInitialContentView pending coordination', () => {
  beforeEach(() => {
    resetPendingHostComponentStoreForTest();
  });

  it('renders parsed pending params and keeps the primary mounted behind a marked pending wrapper', () => {
    function Pending({ count }: { count: number }) {
      return <View testID="pending-content" accessibilityLabel={String(count)} />;
    }
    registerPending(Pending);
    const ref = createRef<View>();
    const node = { measure: vi.fn() };
    const conflictingProps = { id: 'alias', nativeID: 'other', collapsable: true };
    const renderer = render(
      session(
        <PortalInitialContentView {...conflictingProps} url={pendingUrl} ref={ref} testID="root" style={{ flex: 1 }}>
          <View testID="primary-content" />
        </PortalInitialContentView>
      ),
      node
    );

    const root = renderer.root.findByProps({ testID: 'root' });
    expect(root.props.style).toEqual({ flex: 1 });
    expect(ref.current).toBe(node);
    const nativeRoot = renderer.root.findAllByType(View).find((view) => view.props.testID === 'root');
    expect(nativeRoot?.props.nativeID).toBeUndefined();
    expect(nativeRoot?.props.id).toBeUndefined();
    expect(nativeRoot?.props.url).toBeUndefined();
    expect(renderer.root.findByType(Pending).props).toEqual({ count: 2 });
    const primary = renderer.root.findByProps({ testID: 'primary-content' }).parent;
    expect(primary?.props.pointerEvents).toBe('none');
    expect(primary?.props.accessibilityElementsHidden).toBe(true);
    expect(primary?.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(primary?.props.style).toEqual(expect.arrayContaining([{ flex: 1 }, { opacity: 0 }]));
    expect(primary?.props.nativeID).toBeUndefined();
    expect(markedViews(renderer)).toHaveLength(1);
    expect(markedViews(renderer)[0]?.props).toMatchObject({
      collapsable: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
      pointerEvents: 'none',
      style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    });
    expect(markedViews(renderer)[0]?.findByType(Pending)).toBeDefined();
  });

  it.each([null, 'granite://host/example/missing'])(
    'marks the primary wrapper when no pending route matches %s',
    (url) => {
      const renderer = render(
        session(
          <PortalInitialContentView url={url} testID="root">
            <View testID="primary-content" />
          </PortalInitialContentView>
        )
      );
      const views = renderer.root.findAllByType(View);
      expect(views).toHaveLength(3);
      expect(views[0]?.props.nativeID).toBeUndefined();
      expect(markedViews(renderer)).toHaveLength(1);
      expect(markedViews(renderer)[0]?.children).toHaveLength(1);
      expect(markedViews(renderer)[0]?.props.pointerEvents).toBeUndefined();
    }
  );

  it('hands the marker to the primary when pending is hidden without remounting the primary', () => {
    registerPending(() => <View testID="pending-content" />);
    const mounted = vi.fn();
    const unmounted = vi.fn();
    function Primary() {
      useEffect(() => {
        mounted();
        return unmounted;
      }, []);
      return <View testID="primary-content" />;
    }
    const renderer = render(
      session(
        <PortalInitialContentView url={pendingUrl}>
          <Primary />
        </PortalInitialContentView>
      )
    );
    expect(mounted).toHaveBeenCalledTimes(1);
    act(() => hidePendingHostComponent());
    expect(renderer.root.findAllByProps({ testID: 'pending-content' })).toHaveLength(0);
    expect(markedViews(renderer)).toHaveLength(1);
    expect(markedViews(renderer)[0]?.findByType(Primary)).toBeDefined();
    expect(markedViews(renderer)[0]?.props.pointerEvents).toBeUndefined();
    expect(markedViews(renderer)[0]?.props.style).not.toEqual(expect.arrayContaining([{ opacity: 0 }]));
    expect(markedViews(renderer)[0]?.props.accessibilityElementsHidden).toBeUndefined();
    expect(markedViews(renderer)[0]?.props.importantForAccessibility).toBeUndefined();
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(unmounted).not.toHaveBeenCalled();
  });

  it('does not mark an empty outer shell while the primary is suspended', async () => {
    let resolveModule: ((module: { default: ComponentType }) => void) | undefined;
    const Primary = lazy(
      () =>
        new Promise<{ default: ComponentType }>((resolve) => {
          resolveModule = resolve;
        })
    );
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = render(
        session(
          <PortalInitialContentView url={null}>
            <Primary />
          </PortalInitialContentView>
        )
      );
    });
    if (renderer == null || resolveModule == null) {
      throw new Error('The lazy primary was not initialized');
    }
    expect(markedViews(renderer)).toHaveLength(0);
    expect(renderer.toJSON()).toMatchObject({ type: 'View', children: null });

    await act(async () => {
      resolveModule?.({ default: () => <View testID="resolved-content" /> });
    });
    expect(markedViews(renderer)).toHaveLength(1);
    expect(markedViews(renderer)[0]?.findByProps({ testID: 'resolved-content' })).toBeDefined();
  });

  it('keeps pending content outside the primary Suspense boundary', async () => {
    registerPending(() => <View testID="pending-content" />);
    const Primary = lazy(() => new Promise<{ default: ComponentType }>(() => undefined));
    let renderer: ReactTestRenderer | undefined;
    await act(async () => {
      renderer = render(
        session(
          <PortalInitialContentView url={pendingUrl}>
            <Primary />
          </PortalInitialContentView>
        )
      );
    });
    if (renderer == null) {
      throw new Error('The pending renderer was not created');
    }
    expect(markedViews(renderer)).toHaveLength(1);
    expect(markedViews(renderer)[0]?.findByProps({ testID: 'pending-content' })).toBeDefined();
  });

  it('leaves a selected null pending component with no native descendants for the observer to accept', () => {
    registerPending(() => null);
    const renderer = render(
      session(
        <PortalInitialContentView url={pendingUrl}>
          <View testID="primary-content" />
        </PortalInitialContentView>
      )
    );
    expect(markedViews(renderer)).toHaveLength(1);
    expect(markedViews(renderer)[0]?.findAllByType(View)).toHaveLength(1);
    const primary = renderer.root.findByProps({ testID: 'primary-content' }).parent;
    expect(primary?.props.pointerEvents).toBe('none');
    expect(primary?.props.nativeID).toBeUndefined();
  });

  it.each(['primary', 'pending'] as const)(
    'lets an outer error boundary replace failed %s content with explicit initial UI',
    (source) => {
      function Failure(): never {
        throw new Error('Content failed');
      }
      if (source === 'pending') {
        registerPending(Failure);
      }
      const renderer = render(
        session(
          <ContentErrorBoundary>
            <PortalInitialContentView url={pendingUrl}>
              {source === 'primary' ? <Failure /> : <View />}
            </PortalInitialContentView>
          </ContentErrorBoundary>
        )
      );
      expect(markedViews(renderer)).toHaveLength(1);
      expect(markedViews(renderer)[0]?.props.testID).toBe('error-boundary');
      expect(markedViews(renderer)[0]?.findByProps({ testID: 'error-content' })).toBeDefined();
    }
  );
});
