import { CommonActions, createNavigationContainerRef, StackActions } from '@granite-js/native/@react-navigation/native';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router, type RouterProps } from './Router';
import type { RequireContext } from './types';
import { useBackHandler } from '../use-back-event';

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
vi.mock('../native-modules', () => {
  throw new Error('Router must not import host bridges');
});
vi.mock('@granite-js/native/react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: PropsWithChildren) => children,
}));
vi.mock('./components/BackButton', () => ({ BackButton: () => null }));
const pages: Record<string, { default: React.ComponentType }> = {
  './a.tsx': {
    default: function Counter() {
      const [count, setCount] = useState(0);
      return <button onClick={() => setCount((value) => value + 1)}>Count {count}</button>;
    },
  },
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
  vi.restoreAllMocks();
});

async function mountRouter(options: Partial<RouterProps> = {}, blockBack = false, initialUrl = '') {
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
    <Router
      context={context}
      prefix="example://app"
      initialUrl={initialUrl}
      screenContainer={Container}
      navigationContainerRef={ref as any}
      onRootBack={observed.closeView}
      {...options}
    />
  );
  await waitFor(() => expect(ref.isReady()).toBe(true));
  return ref;
}

function optionsFor(key: string) {
  return observed.descriptors[key].options;
}

const ThemeContext = createContext('black');
function ThemedRouter({ onReady }: { onReady?: () => void }) {
  const color = useContext(ThemeContext);
  return (
    <Router
      context={context}
      prefix="example://app"
      onReady={onReady}
      defaultScreenOptions={() => ({ headerTintColor: color })}
    />
  );
}

describe('Router defaultScreenOptions context', () => {
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

  it('passes the original arguments to a legacy callback', async () => {
    const legacy = vi.fn<Extract<RouterProps['defaultScreenOption'], (...args: any[]) => any>>(() => ({}));
    await mountRouter({ defaultScreenOption: legacy });
    expect(legacy.mock.calls[0]![0]).not.toHaveProperty('routeIndex');
    expect(legacy.mock.calls[0]![0]).not.toHaveProperty('onBack');
  });

  it('uses plural options without merging or evaluating the alias for untyped callers', async () => {
    const legacy = vi.fn(() => ({ title: 'Legacy', headerShown: false }));
    const ref = await mountRouter({
      defaultScreenOptions: { title: 'Current' },
      defaultScreenOption: legacy,
    } as unknown as RouterProps);
    expect(optionsFor(ref.getRootState().routes[0]!.key).title).toBe('Current');
    expect(optionsFor(ref.getRootState().routes[0]!.key).headerShown).toBeUndefined();
    expect(legacy).not.toHaveBeenCalled();
  });

  it('reports each route position independently of focus when the same page is pushed and popped', async () => {
    const ref = await mountRouter({
      defaultScreenOptions: ({ routeIndex }) => ({ title: `Route ${routeIndex}`, headerShown: routeIndex !== 0 }),
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
      defaultScreenOptions: ({ routeIndex }) => ({ title: `Route ${routeIndex}`, headerShown: routeIndex !== 0 }),
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
      { defaultScreenOptions: ({ routeIndex }) => ({ headerShown: routeIndex !== 0 }), onStateChange },
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
      defaultScreenOptions: ({ routeIndex }) => ({ headerShown: routeIndex !== 0 }),
    });
    const routes = ref.getRootState().routes;
    expect(optionsFor(routes[0]!.key).headerShown).toBe(false);
    expect(optionsFor(routes[1]!.key).headerShown).toBe(true);
  });

  it.each([undefined, () => null])('preserves explicit common headerLeft overrides (%s)', async (headerLeft) => {
    const ref = await mountRouter({
      defaultScreenOptions: () => ({ title: 'Common', headerLeft }),
    });
    expect(optionsFor(ref.getRootState().routes[0]!.key)).toMatchObject({ title: 'Common', headerLeft });
    act(() => ref.dispatch(StackActions.replace('/b')));
    expect(optionsFor(ref.getRootState().routes[0]!.key).title).toBe('Page B');
  });

  it('passes route and navigation to the callback and closes the host through onBack', async () => {
    const defaultScreenOptions = vi.fn<Extract<RouterProps['defaultScreenOptions'], (...args: any[]) => any>>();
    defaultScreenOptions.mockReturnValue({});
    const ref = await mountRouter({ defaultScreenOptions });
    const props = defaultScreenOptions.mock.calls.at(-1)![0];
    expect(props.route.key).toBe(ref.getRootState().routes[0]!.key);
    expect(props.routeIndex).toBe(0);
    expect(props.navigation.getState().routes[0]!.key).toBe(props.route.key);
    act(() => props.onBack());
    expect(observed.closeView).toHaveBeenCalledTimes(1);
    act(() => props.navigation.setOptions({ title: 'Updated' }));
    expect(optionsFor(props.route.key).title).toBe('Updated');
  });

  it('does not classify a preloaded screen as the first route', async () => {
    const defaultScreenOptions = vi.fn<Extract<RouterProps['defaultScreenOptions'], (...args: any[]) => any>>(
      ({ routeIndex }) => ({ headerShown: routeIndex !== 0 })
    );
    const ref = await mountRouter({ defaultScreenOptions });
    act(() => ref.dispatch(CommonActions.preload('/b')));
    const preloaded = defaultScreenOptions.mock.calls.findLast(([props]) => props.route.name === '/b')![0];
    expect(preloaded.routeIndex).toBe(-1);
    expect(optionsFor(preloaded.route.key).headerShown).toBe(true);
    act(() => ref.dispatch(StackActions.push('/b')));
    const pushed = defaultScreenOptions.mock.calls.findLast(([props]) => props.route.name === '/b')![0];
    expect(pushed.routeIndex).toBe(1);
  });

  it('uses onBack from a pushed screen to pop before closing the host', async () => {
    const defaultScreenOptions = vi.fn<Extract<RouterProps['defaultScreenOptions'], (...args: any[]) => any>>(
      () => ({})
    );
    const ref = await mountRouter({ defaultScreenOptions });
    act(() => ref.dispatch(StackActions.push('/a')));
    const currentKey = ref.getRootState().routes[1]!.key;
    const props = defaultScreenOptions.mock.calls.findLast(([props]) => props.route.key === currentKey)![0];
    expect(props.routeIndex).toBe(1);
    act(() => props.onBack());
    expect(ref.getRootState().routes).toHaveLength(1);
    expect(observed.closeView).not.toHaveBeenCalled();
  });

  it('respects a registered back handler instead of closing the host', async () => {
    let onBack = () => {};
    await mountRouter(
      {
        defaultScreenOptions: (props) => {
          onBack = props.onBack;
          return {};
        },
      },
      true
    );
    act(() => onBack());
    expect(observed.closeView).not.toHaveBeenCalled();
  });
  it('updates options from a parent hook without resetting navigation or remounting screens', async () => {
    const ready = vi.fn();
    const view = render(
      <ThemeContext.Provider value="black">
        <ThemedRouter onReady={ready} />
      </ThemeContext.Provider>
    );
    await waitFor(() => expect(ready).toHaveBeenCalledOnce());
    const first = Object.values(observed.descriptors)[0];
    fireEvent.click(screen.getByRole('button', { name: 'Count 0' }));
    act(() => first.navigation.dispatch(StackActions.push('/b')));
    const keys = Object.keys(observed.descriptors);
    view.rerender(
      <ThemeContext.Provider value="white">
        <ThemedRouter onReady={ready} />
      </ThemeContext.Provider>
    );
    expect(Object.keys(observed.descriptors)).toEqual(keys);
    expect(optionsFor(keys[0]!).headerTintColor).toBe('white');
    expect(optionsFor(keys[1]!).headerTintColor).toBe('white');
    expect(screen.getByRole('button', { name: 'Count 1' })).toBeDefined();
    expect(ready).toHaveBeenCalledOnce();
  });

  it('does not call a host bridge when no root back callback is supplied', async () => {
    let onBack = () => {};
    await mountRouter({
      onRootBack: undefined,
      defaultScreenOptions: (props) => {
        onBack = props.onBack;
        return {};
      },
    });
    act(() => onBack());
    expect(observed.closeView).not.toHaveBeenCalled();
  });

  it('isolates back handlers between independent routers', async () => {
    let firstBack = () => {};
    let secondBack = () => {};
    const firstClose = vi.fn();
    const secondClose = vi.fn();
    await mountRouter(
      {
        onRootBack: firstClose,
        defaultScreenOptions: (props) => {
          firstBack = props.onBack;
          return {};
        },
      },
      true
    );
    await mountRouter({
      onRootBack: secondClose,
      defaultScreenOptions: (props) => {
        secondBack = props.onBack;
        return {};
      },
    });
    act(() => firstBack());
    act(() => secondBack());
    expect(firstClose).not.toHaveBeenCalled();
    expect(secondClose).toHaveBeenCalledOnce();
  });
  it('composes host gesture state with consumer callbacks through restore and navigation', async () => {
    vi.spyOn(Platform, 'OS', 'get').mockReturnValue('ios');
    const setGesture = vi.fn();
    const onReady = vi.fn();
    const onStateChange = vi.fn();
    const ref = await mountRouter({
      initialState: { index: 1, routes: [{ name: '/a' }, { name: '/b' }] },
      setIosSwipeGestureEnabled: setGesture,
      onReady,
      onStateChange,
    });
    expect(onReady).toHaveBeenCalledOnce();
    expect(setGesture).toHaveBeenCalledWith({ isEnabled: false });
    act(() => ref.goBack());
    expect(onStateChange).toHaveBeenCalled();
    expect(setGesture).toHaveBeenLastCalledWith({ isEnabled: true });
    act(() => ref.dispatch(StackActions.push('/b')));
    expect(setGesture).toHaveBeenLastCalledWith({ isEnabled: false });
  });

  it('does not re-resolve an entry URL or reset the stack when app props update', async () => {
    const ref = createNavigationContainerRef<{ '/a': undefined; '/b': undefined }>();
    const getInitialUrl = vi.fn((url?: string) => url);
    const view = render(
      <Router
        context={context}
        prefix="example://app"
        initialUrl="example://app/b"
        getInitialUrl={getInitialUrl}
        navigationContainerRef={ref as any}
      />
    );
    await waitFor(() => expect(ref.isReady()).toBe(true));
    expect(ref.getRootState().routes[0]!.name).toBe('/b');
    act(() => ref.dispatch(StackActions.push('/a')));
    const routes = ref.getRootState().routes;
    const calls = getInitialUrl.mock.calls.length;
    view.rerender(
      <Router
        context={context}
        prefix="example://app"
        initialUrl="example://app/a"
        getInitialUrl={getInitialUrl}
        navigationContainerRef={ref as any}
      />
    );
    expect(ref.getRootState().routes).toEqual(routes);
    expect(getInitialUrl).toHaveBeenCalledTimes(calls);
  });
});
