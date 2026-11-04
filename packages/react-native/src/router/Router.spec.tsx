import { CommonActions, createNavigationContainerRef, StackActions } from '@granite-js/native/@react-navigation/native';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useEffect, type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router, type RouterProps } from './Router';
import type { RequireContext } from './types';
import { BackEventProvider, useBackHandler } from '../use-back-event';

const observed = vi.hoisted(() => ({ descriptors: {} as Record<string, any>, closeView: vi.fn() }));

// Exercise the real navigation state and descriptor resolution without native rendering.
vi.mock('./components/StackNavigator', async () => {
  const { createNavigatorFactory, useNavigationBuilder, StackRouter } = await import(
    '@granite-js/native/@react-navigation/native'
  );
  function Navigator(props: any) {
    const { descriptors, describe, state, NavigationContent } = useNavigationBuilder(StackRouter, props);
    // Native-stack resolves descriptors for preloaded screens before they enter the stack.
    observed.descriptors = {
      ...Object.fromEntries(state.preloadedRoutes.map((route) => [route.key, describe(route, true)])),
      ...descriptors,
    };
    return <NavigationContent>{state.routes.map((route) => descriptors[route.key]!.render())}</NavigationContent>;
  }
  return { StackNavigator: createNavigatorFactory(Navigator)() };
});
vi.mock('../native-modules', () => ({ closeView: observed.closeView }));
vi.mock('../visibility', () => ({ useVisibility: () => true }));
vi.mock('./components/BackButton', () => ({ BackButton: () => null }));
const pages: Record<string, { default: () => null }> = {
  './a.tsx': { default: () => null },
  './b.tsx': { default: Object.assign(() => null, { screenOptions: { title: 'Page B' } }) },
  './_404.tsx': { default: () => null },
};
const context: RequireContext = Object.assign(<T,>(id: string) => pages[id] as T, {
  keys: () => Object.keys(pages),
  resolve: (id: string) => id,
  id: 'test',
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function mountRouter(options: RouterProps = {}, blockBack = false, initialScheme = '') {
  const ref = createNavigationContainerRef<{ '/a': undefined; '/b': undefined }>();
  function Container({ children }: PropsWithChildren) {
    const back = useBackHandler();
    useEffect(() => {
      if (blockBack) {
        const subscription = back.addEventListener(() => true);
        return () => subscription.remove();
      }
      return undefined;
    }, [back]);
    return children;
  }
  render(
    <BackEventProvider>
      <Router
        context={context}
        prefix="example://app"
        initialScheme={initialScheme}
        initialProps={{ platform: 'android', initialColorPreference: 'light' }}
        container={Container}
        navigationContainerRef={ref as any}
        {...options}
      />
    </BackEventProvider>
  );
  await waitFor(() => expect(ref.isReady()).toBe(true));
  return ref;
}

function optionsFor(key: string) {
  return observed.descriptors[key].options;
}

describe('Router defaultScreenOption context', () => {
  it('preserves existing defaults when omitted', async () => {
    const ref = await mountRouter();
    expect(optionsFor(ref.getRootState().routes[0]!.key)).toMatchObject({
      gestureEnabled: true,
      headerLeft: expect.any(Function),
    });
  });

  it('preserves object options and existing callbacks using only route and navigation', async () => {
    const ref = await mountRouter({ defaultScreenOption: { title: 'Common', headerShown: false } });
    expect(optionsFor(ref.getRootState().routes[0]!.key)).toMatchObject({ title: 'Common', headerShown: false });
    cleanup();
    const otherRef = await mountRouter({
      defaultScreenOption: ({ route, navigation }) => ({ title: route.name, headerShown: navigation.isFocused() }),
    });
    expect(optionsFor(otherRef.getRootState().routes[0]!.key).title).toBe('/a');
  });

  it('reports each route position independently of focus when the same page is pushed and popped', async () => {
    const ref = await mountRouter({
      defaultScreenOption: ({ routeIndex }) => ({ title: `Route ${routeIndex}`, headerShown: routeIndex !== 0 }),
    });
    const firstKey = ref.getRootState().routes[0]!.key;
    act(() => ref.dispatch(StackActions.push('/a')));
    const pushedKey = ref.getRootState().routes[1]!.key;
    expect(optionsFor(firstKey).title).toBe('Route 0');
    expect(optionsFor(pushedKey).title).toBe('Route 1');
    expect(optionsFor(pushedKey).headerShown).toBe(true);
    act(() => ref.goBack());
    expect(optionsFor(firstKey).headerShown).toBe(false);
  });

  it('updates route positions after replace and reset', async () => {
    const ref = await mountRouter({
      defaultScreenOption: ({ routeIndex }) => ({ title: `Route ${routeIndex}`, headerShown: routeIndex !== 0 }),
    });
    act(() => ref.dispatch(StackActions.replace('/b')));
    expect(optionsFor(ref.getRootState().routes[0]!.key)).toMatchObject({ headerShown: false, title: 'Page B' });
    act(() => ref.resetRoot({ index: 1, routes: [{ name: '/b' }, { name: '/a' }] }));
    const routes = ref.getRootState().routes;
    expect(optionsFor(routes[0]!.key).headerShown).toBe(false);
    expect(optionsFor(routes[1]!.key).headerShown).toBe(true);
  });

  it('reports index zero for a deep-link entry instead of its registration order', async () => {
    const onStateChange = vi.fn();
    const ref = await mountRouter(
      { defaultScreenOption: ({ routeIndex }) => ({ headerShown: routeIndex !== 0 }), onStateChange },
      false,
      'example://app/b'
    );
    const route = ref.getRootState().routes[0]!;
    expect(route.name).toBe('/b');
    expect(optionsFor(route.key)).toMatchObject({ headerShown: false, title: 'Page B' });
    act(() => ref.dispatch(StackActions.push('/a')));
    expect(onStateChange).toHaveBeenCalled();
    expect(optionsFor(ref.getRootState().routes[1]!.key).headerShown).toBe(true);
  });

  it('reports route positions in restored state even when a later route is focused', async () => {
    const ref = await mountRouter({
      initialState: { index: 1, routes: [{ name: '/b' }, { name: '/a' }] },
      defaultScreenOption: ({ routeIndex }) => ({ headerShown: routeIndex !== 0 }),
    });
    const routes = ref.getRootState().routes;
    expect(optionsFor(routes[0]!.key).headerShown).toBe(false);
    expect(optionsFor(routes[1]!.key).headerShown).toBe(true);
  });

  it.each([undefined, () => null])('preserves explicit common headerLeft overrides (%s)', async (headerLeft) => {
    const ref = await mountRouter({
      defaultScreenOption: () => ({ title: 'Common', headerLeft }),
    });
    expect(optionsFor(ref.getRootState().routes[0]!.key)).toMatchObject({ title: 'Common', headerLeft });
    act(() => ref.dispatch(StackActions.replace('/b')));
    expect(optionsFor(ref.getRootState().routes[0]!.key).title).toBe('Page B');
  });

  it('passes route and navigation to the callback and closes the host through onBack', async () => {
    const defaultScreenOption = vi.fn<Extract<RouterProps['defaultScreenOption'], (...args: any[]) => any>>();
    defaultScreenOption.mockReturnValue({});
    const ref = await mountRouter({ defaultScreenOption });
    const props = defaultScreenOption.mock.calls.at(-1)![0];
    expect(props.route.key).toBe(ref.getRootState().routes[0]!.key);
    expect(props.routeIndex).toBe(0);
    expect(props.navigation.getState().routes[0]!.key).toBe(props.route.key);
    act(() => props.onBack());
    expect(observed.closeView).toHaveBeenCalledTimes(1);
    act(() => props.navigation.setOptions({ title: 'Updated' }));
    expect(optionsFor(props.route.key).title).toBe('Updated');
  });

  it('does not classify a preloaded screen as the first route', async () => {
    const defaultScreenOption = vi.fn<Extract<RouterProps['defaultScreenOption'], (...args: any[]) => any>>(
      ({ routeIndex }) => ({ headerShown: routeIndex !== 0 })
    );
    const ref = await mountRouter({ defaultScreenOption });
    act(() => ref.dispatch(CommonActions.preload('/b')));
    const preloaded = defaultScreenOption.mock.calls.findLast(([props]) => props.route.name === '/b')![0];
    expect(preloaded.routeIndex).toBe(-1);
    expect(optionsFor(preloaded.route.key).headerShown).toBe(true);
    act(() => ref.dispatch(StackActions.push('/b')));
    const pushed = defaultScreenOption.mock.calls.findLast(([props]) => props.route.name === '/b')![0];
    expect(pushed.routeIndex).toBe(1);
  });

  it('uses onBack from a pushed screen to pop before closing the host', async () => {
    const defaultScreenOption = vi.fn<Extract<RouterProps['defaultScreenOption'], (...args: any[]) => any>>(() => ({}));
    const ref = await mountRouter({ defaultScreenOption });
    act(() => ref.dispatch(StackActions.push('/a')));
    const currentKey = ref.getRootState().routes[1]!.key;
    const props = defaultScreenOption.mock.calls.findLast(([props]) => props.route.key === currentKey)![0];
    expect(props.routeIndex).toBe(1);
    act(() => props.onBack());
    expect(ref.getRootState().routes).toHaveLength(1);
    expect(observed.closeView).not.toHaveBeenCalled();
  });

  it('respects a registered back handler instead of closing the host', async () => {
    let onBack = () => {};
    await mountRouter(
      {
        defaultScreenOption: (props) => {
          onBack = props.onBack;
          return {};
        },
      },
      true
    );
    act(() => onBack());
    expect(observed.closeView).not.toHaveBeenCalled();
  });
});
