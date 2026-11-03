import { createNavigationContainerRef, StackActions } from '@granite-js/native/@react-navigation/native';
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
    const { descriptors, state, NavigationContent } = useNavigationBuilder(StackRouter, props);
    observed.descriptors = descriptors;
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

describe('Router initialScreenOptions', () => {
  it('preserves existing defaults when omitted', async () => {
    const ref = await mountRouter();
    expect(optionsFor(ref.getRootState().routes[0]!.key)).toMatchObject({
      gestureEnabled: true,
      headerLeft: expect.any(Function),
    });
  });

  it('keeps fallback options on the bottom route when the same page is pushed and popped', async () => {
    const ref = await mountRouter({ initialScreenOptions: { title: 'First', headerShown: false } });
    const firstKey = ref.getRootState().routes[0]!.key;
    act(() => ref.dispatch(StackActions.push('/a')));
    const pushedKey = ref.getRootState().routes[1]!.key;
    expect(optionsFor(firstKey).title).toBe('First');
    expect(optionsFor(pushedKey).headerShown).toBeUndefined();
    act(() => ref.goBack());
    expect(optionsFor(firstKey).headerShown).toBe(false);
  });

  it('applies fallback options to the new bottom route after replace and reset', async () => {
    const ref = await mountRouter({ initialScreenOptions: { title: 'First', headerShown: false } });
    act(() => ref.dispatch(StackActions.replace('/b')));
    expect(optionsFor(ref.getRootState().routes[0]!.key)).toMatchObject({ headerShown: false, title: 'Page B' });
    act(() => ref.resetRoot({ index: 1, routes: [{ name: '/b' }, { name: '/a' }] }));
    const routes = ref.getRootState().routes;
    expect(optionsFor(routes[0]!.key).headerShown).toBe(false);
    expect(optionsFor(routes[1]!.key).headerShown).toBeUndefined();
  });

  it('applies fallback options immediately to a deep-link entry instead of the first registered page', async () => {
    const onStateChange = vi.fn();
    const ref = await mountRouter(
      { initialScreenOptions: { headerShown: false }, onStateChange },
      false,
      'example://app/b'
    );
    const route = ref.getRootState().routes[0]!;
    expect(route.name).toBe('/b');
    expect(optionsFor(route.key)).toMatchObject({ headerShown: false, title: 'Page B' });
    act(() => ref.dispatch(StackActions.push('/a')));
    expect(onStateChange).toHaveBeenCalled();
    expect(optionsFor(ref.getRootState().routes[1]!.key).headerShown).toBeUndefined();
  });

  it('uses the bottom route of restored state even when a later route is focused', async () => {
    const ref = await mountRouter({
      initialState: { index: 1, routes: [{ name: '/b' }, { name: '/a' }] },
      initialScreenOptions: { headerShown: false },
    });
    const routes = ref.getRootState().routes;
    expect(optionsFor(routes[0]!.key).headerShown).toBe(false);
    expect(optionsFor(routes[1]!.key).headerShown).toBeUndefined();
  });

  it.each([undefined, () => null])('preserves explicit common headerLeft overrides (%s)', async (headerLeft) => {
    const ref = await mountRouter({
      initialScreenOptions: { title: 'First', headerLeft: () => null },
      defaultScreenOption: () => ({ title: 'Common', headerLeft }),
    });
    expect(optionsFor(ref.getRootState().routes[0]!.key)).toMatchObject({ title: 'Common', headerLeft });
    act(() => ref.dispatch(StackActions.replace('/b')));
    expect(optionsFor(ref.getRootState().routes[0]!.key).title).toBe('Page B');
  });

  it('passes route and navigation to the callback and closes the host through onBack', async () => {
    const initialScreenOptions = vi.fn<Extract<RouterProps['initialScreenOptions'], (...args: any[]) => any>>();
    initialScreenOptions.mockReturnValue({});
    const ref = await mountRouter({ initialScreenOptions });
    const props = initialScreenOptions.mock.calls.at(-1)![0];
    expect(props.route.key).toBe(ref.getRootState().routes[0]!.key);
    expect(props.navigation.getState().routes[0]!.key).toBe(props.route.key);
    act(() => props.onBack());
    expect(observed.closeView).toHaveBeenCalledTimes(1);
    act(() => props.navigation.setOptions({ title: 'Updated' }));
    expect(optionsFor(props.route.key).title).toBe('Updated');
  });

  it('respects a registered back handler instead of closing the host', async () => {
    let onBack = () => {};
    await mountRouter(
      {
        initialScreenOptions: (props) => {
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
