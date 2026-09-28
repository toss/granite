import { useEffect, type ComponentType, type ReactElement } from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentSessionsRenderer, RNComponentViewRenderer } from './RNComponentViewRenderer';
import { recordComponentProvider, resetComponentProviderStoreForTest } from './componentProviderStore';
import { createComponentSessionFixture } from '../../test/componentSessionFixture';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

function Demo(props: { readonly count?: number }) {
  return <demo-view count={props.count} />;
}

function Broken(): never {
  throw new Error('Broken component');
}

function Replacement() {
  return <demo-view count={100} />;
}

let mountCount = 0;

function MountCounter(props: { readonly count?: number }) {
  useEffect(() => {
    mountCount += 1;
  }, []);
  return <demo-view count={props.count} />;
}

/** Wraps a component in a new type on every call, as a provider like `() => codePush(App)` does. */
function wrapInNewType(Wrapped: ComponentType<{ readonly count?: number }>) {
  return function Wrapper(props: { readonly count?: number }) {
    return <Wrapped {...props} />;
  };
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'demo-view': { readonly count?: number };
    }
  }
}

function openComponent(
  sessionId: string,
  options: {
    readonly componentName?: string;
    readonly props?: Record<string, unknown>;
    readonly sizing?: 'contentHeight' | 'contentSize' | 'constrained';
    readonly bundleFilePath?: string;
  } = {}
) {
  return {
    name: 'openComponent',
    params: {
      sessionId,
      componentName: options.componentName ?? 'Demo',
      props: options.props ?? {},
      sizing: options.sizing ?? 'contentHeight',
      ...(options.bundleFilePath == null ? {} : { bundleFilePath: options.bundleFilePath }),
    },
  } as const;
}

function renderTree(element: ReactElement) {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(element);
  });
  if (renderer == null) {
    throw new Error('The component session renderer was not created');
  }
  const root = renderer.root;
  return {
    portals: () => root.findAllByType('PortalView' as never),
    demoViews: () => root.findAllByType('demo-view' as never),
    measuringViews: () => root.findAll((node: ReactTestInstance) => typeof node.props.onLayout === 'function'),
    unmount: () => act(() => renderer?.unmount()),
  };
}

function renderComponentSessions(
  fixture: ReturnType<typeof createComponentSessionFixture>,
  options: { readonly withRuntime?: boolean } = {}
) {
  const runtime = (options.withRuntime ?? true) ? fixture.runtime : undefined;
  return renderTree(<ComponentSessionsRenderer client={fixture.client} runtime={runtime} />);
}

function layout(width: number, height: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width, height } } };
}

describe('RNComponentViewRenderer', () => {
  beforeEach(() => {
    resetComponentProviderStoreForTest();
    recordComponentProvider('Demo', () => Demo);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an open component into the Portal host named after its session', () => {
    // Given
    const fixture = createComponentSessionFixture();
    fixture.emitEvent(openComponent('component-1', { props: { count: 1 } }));

    // When
    const rendered = renderComponentSessions(fixture);

    // Then
    expect(rendered.portals().map((portal) => portal.props.hostName)).toEqual(['component-1']);
    expect(rendered.demoViews().map((view) => view.props.count)).toEqual([1]);
    rendered.unmount();
  });

  it('passes replaced props and removes the Portal when the session closes', () => {
    // Given
    const fixture = createComponentSessionFixture();
    const rendered = renderComponentSessions(fixture);
    act(() => fixture.emitEvent(openComponent('component-1', { props: { count: 1 } })));

    // When
    act(() =>
      fixture.emitEvent({
        name: 'updateComponentProps',
        params: { sessionId: 'component-1', props: { count: 2 } },
      })
    );
    const countsAfterUpdate = rendered.demoViews().map((view) => view.props.count);
    act(() => fixture.emitEvent({ name: 'closeComponent', params: { sessionId: 'component-1' } }));

    // Then
    expect(countsAfterUpdate).toEqual([2]);
    expect(rendered.portals()).toEqual([]);
    rendered.unmount();
  });

  it('renders a component once it is registered', () => {
    // Given
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = createComponentSessionFixture();
    const rendered = renderComponentSessions(fixture);
    act(() => fixture.emitEvent(openComponent('component-1', { componentName: 'Later' })));
    const portalsBeforeRegistration = rendered.portals().length;

    // When
    act(() => recordComponentProvider('Later', () => Demo));

    // Then
    expect(portalsBeforeRegistration).toBe(0);
    expect(rendered.portals()).toHaveLength(1);
    rendered.unmount();
  });

  it('renders the component registered again under the same name', () => {
    // Given
    const fixture = createComponentSessionFixture();
    const rendered = renderComponentSessions(fixture);
    act(() => fixture.emitEvent(openComponent('component-1', { props: { count: 1 } })));

    // When
    act(() => recordComponentProvider('Demo', () => Replacement));

    // Then
    expect(rendered.demoViews().map((view) => view.props.count)).toEqual([100]);
    rendered.unmount();
  });

  it('calls a component provider once and keeps the component mounted when the props change', () => {
    // Given
    mountCount = 0;
    const componentProvider = vi.fn(() => wrapInNewType(MountCounter));
    recordComponentProvider('Wrapped', componentProvider);
    const fixture = createComponentSessionFixture();
    const rendered = renderComponentSessions(fixture);
    act(() => fixture.emitEvent(openComponent('component-1', { componentName: 'Wrapped', props: { count: 1 } })));

    // When
    act(() =>
      fixture.emitEvent({
        name: 'updateComponentProps',
        params: { sessionId: 'component-1', props: { count: 2 } },
      })
    );
    act(() =>
      fixture.emitEvent({
        name: 'updateComponentProps',
        params: { sessionId: 'component-1', props: { count: 3 } },
      })
    );

    // Then
    expect(rendered.demoViews().map((view) => view.props.count)).toEqual([3]);
    expect(componentProvider).toHaveBeenCalledOnce();
    expect(mountCount).toBe(1);
    rendered.unmount();
  });

  it('evaluates a component bundle once before rendering the components it registers', async () => {
    // Given
    const fixture = createComponentSessionFixture();
    let finishEvaluation: () => void = () => undefined;
    fixture.runtime.evaluateScript.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishEvaluation = () => {
            recordComponentProvider('Remote', () => Demo);
            resolve();
          };
        })
    );
    const rendered = renderComponentSessions(fixture);
    act(() => {
      fixture.emitEvent(openComponent('component-1', { componentName: 'Remote', bundleFilePath: '/b/remote' }));
      fixture.emitEvent(openComponent('component-2', { componentName: 'Remote', bundleFilePath: '/b/remote' }));
    });
    const portalsWhileEvaluating = rendered.portals().length;

    // When
    await act(async () => finishEvaluation());

    // Then
    expect(portalsWhileEvaluating).toBe(0);
    expect(fixture.runtime.evaluateScript).toHaveBeenCalledOnce();
    expect(fixture.runtime.evaluateScript).toHaveBeenCalledWith('/b/remote');
    expect(rendered.portals().map((portal) => portal.props.hostName)).toEqual(['component-1', 'component-2']);
    rendered.unmount();
  });

  it('leaves a component that names a bundle empty when it has no runtime to evaluate the bundle', () => {
    // Given
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    recordComponentProvider('Remote', () => Demo);
    const fixture = createComponentSessionFixture();
    fixture.emitEvent(openComponent('component-1', { componentName: 'Remote', bundleFilePath: '/b/remote' }));

    // When
    const rendered = renderComponentSessions(fixture, { withRuntime: false });

    // Then
    expect(rendered.portals()).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      "RNComponentView component 'Remote' names the bundle '/b/remote', but RNComponentViewRenderer has no runtime to evaluate it"
    );
    rendered.unmount();
  });

  it('reports the measured content size and skips changes under half a point', () => {
    // Given
    const fixture = createComponentSessionFixture();
    fixture.emitEvent(openComponent('component-1', { sizing: 'contentSize' }));
    const rendered = renderComponentSessions(fixture);
    const [measuringView] = rendered.measuringViews();

    // When
    act(() => {
      measuringView?.props.onLayout(layout(120, 48));
      measuringView?.props.onLayout(layout(120.2, 48.3));
      measuringView?.props.onLayout(layout(130, 48));
    });

    // Then
    expect(fixture.nativeModule.reportContentSize).toHaveBeenNthCalledWith(1, {
      sessionId: 'component-1',
      width: 120,
      height: 48,
    });
    expect(fixture.nativeModule.reportContentSize).toHaveBeenNthCalledWith(2, {
      sessionId: 'component-1',
      width: 130,
      height: 48,
    });
    expect(fixture.nativeModule.reportContentSize).toHaveBeenCalledTimes(2);
    rendered.unmount();
  });

  it('does not measure a component that fills its host', () => {
    // Given
    const fixture = createComponentSessionFixture();
    fixture.emitEvent(openComponent('component-1', { sizing: 'constrained' }));

    // When
    const rendered = renderComponentSessions(fixture);

    // Then
    expect(rendered.demoViews()).toHaveLength(1);
    expect(rendered.measuringViews()).toEqual([]);
    rendered.unmount();
  });

  it('keeps other components rendering when one throws', () => {
    // Given
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    recordComponentProvider('Broken', () => Broken);
    const fixture = createComponentSessionFixture();
    fixture.emitEvent(openComponent('component-1', { componentName: 'Broken' }));
    fixture.emitEvent(openComponent('component-2', { props: { count: 2 } }));

    // When
    const rendered = renderComponentSessions(fixture);

    // Then
    expect(rendered.demoViews().map((view) => view.props.count)).toEqual([2]);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to render RNComponentView component 'Broken'",
      expect.objectContaining({ message: 'Broken component' })
    );
    rendered.unmount();
  });

  it('keeps other components rendering when a component provider throws', () => {
    // Given
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    recordComponentProvider('BrokenProvider', () => {
      throw new Error('Broken provider');
    });
    const fixture = createComponentSessionFixture();
    fixture.emitEvent(openComponent('component-1', { componentName: 'BrokenProvider' }));
    fixture.emitEvent(openComponent('component-2', { props: { count: 2 } }));

    // When
    const rendered = renderComponentSessions(fixture);

    // Then
    expect(rendered.demoViews().map((view) => view.props.count)).toEqual([2]);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to render RNComponentView component 'BrokenProvider'",
      expect.objectContaining({ message: 'Broken provider' })
    );
    rendered.unmount();
  });

  it('renders nothing when the app does not include the native module', () => {
    // Given the react-native stub, whose TurboModuleRegistry has no native module

    // When
    const rendered = renderTree(<RNComponentViewRenderer />);

    // Then
    expect(rendered.portals()).toEqual([]);
    rendered.unmount();
  });
});
