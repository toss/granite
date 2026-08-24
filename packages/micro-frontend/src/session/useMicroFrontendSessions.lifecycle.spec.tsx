import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type MicroFrontendSessionState, useMicroFrontendSessions } from './useMicroFrontendSessions';
import {
  registerPendingHostComponentRoute,
  resetPendingHostComponentStoreForTest,
  resolvePendingHostComponent,
} from '../host/pendingHostComponentStore';
import {
  createMicroFrontendRuntimeWithDependencies,
  type NativeMicroFrontendRuntime,
  type NativeMicroFrontendRuntimeEvent,
} from '../runtime/createMicroFrontendRuntime';
import { getMicroFrontendGlobalContext } from '../runtime/globalContext';
import { parseNativeRuntimeEvent } from '../runtime/parseNativeRuntimeEvent';
import {
  createContainer,
  exposeModule,
  getMicroFrontendRuntimeContext,
  microFrontendModuleRegistry,
  registerShared,
} from '../runtime/registry';
import type { MicroFrontendRuntimeApi } from '../types';

Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true);

function createRuntimeFixture() {
  const listeners = new Set<(event: NativeMicroFrontendRuntimeEvent) => void>();
  const adapter = {
    loadBundle: vi.fn(async ({ appName }: { readonly appName: string }) => ({
      filePath: `/bundles/${appName}.hbc`,
    })),
  };
  const nativeRuntime: NativeMicroFrontendRuntime = {
    evaluateScript: vi.fn(async () => undefined),
    startEventDelivery: vi.fn(),
    onEvent(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  const onLifecycleEvent = vi.fn();
  const runtime = createMicroFrontendRuntimeWithDependencies({
    adapter,
    nativeRuntime,
    onLifecycleEvent,
    onPreloadError: vi.fn(),
    registry: microFrontendModuleRegistry,
    removePendingHostComponentRoutes: vi.fn(),
    parseEvent: parseNativeRuntimeEvent,
  });

  return {
    adapter,
    emit(event: NativeMicroFrontendRuntimeEvent) {
      listeners.forEach((listener) => listener(event));
    },
    get listenerCount() {
      return listeners.size;
    },
    nativeRuntime,
    onLifecycleEvent,
    runtime,
  };
}

function renderSessions(runtime: Pick<MicroFrontendRuntimeApi, 'onEvent'>) {
  let current: readonly MicroFrontendSessionState[] = [];
  function Consumer() {
    current = useMicroFrontendSessions(runtime);
    return null;
  }
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(<Consumer />);
  });
  return {
    get current() {
      return current;
    },
    unmount() {
      act(() => renderer?.unmount());
    },
  };
}

function openSession(fixture: ReturnType<typeof createRuntimeFixture>, appName: string, sessionId: string): void {
  fixture.emit({
    name: 'openApp',
    params: { appName, scheme: `granite://${appName}/product`, sessionId },
  });
}

function AppPendingComponent() {
  return null;
}

describe('useMicroFrontendSessions app lifetime', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '__MICRO_FRONTEND__');
    resetPendingHostComponentStoreForTest();
  });

  it('reports committed mounts and dispose-completed unmounts', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);
    let finishDispose: (() => void) | undefined;
    getMicroFrontendRuntimeContext().dispose(
      'app-1',
      () =>
        new Promise<void>((resolve) => {
          finishDispose = resolve;
        })
    );

    // When
    act(() => openSession(fixture, 'app-1', 'app-1:1'));
    act(() => openSession(fixture, 'app-2', 'app-2:1'));
    await act(async () => {
      fixture.emit({ name: 'closeApp', params: { sessionId: 'app-2:1' } });
    });
    await act(async () => {
      fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:1' } });
      await Promise.resolve();
    });

    // Then
    expect(fixture.onLifecycleEvent).toHaveBeenCalledTimes(3);
    expect(fixture.onLifecycleEvent).toHaveBeenNthCalledWith(1, {
      phase: 'mounted',
      session: {
        appName: 'app-1',
        id: 'app-1:1',
      },
      activeSessions: [{ appName: 'app-1', id: 'app-1:1' }],
    });
    expect(fixture.onLifecycleEvent).toHaveBeenNthCalledWith(2, {
      phase: 'mounted',
      session: {
        appName: 'app-2',
        id: 'app-2:1',
      },
      activeSessions: [
        { appName: 'app-1', id: 'app-1:1' },
        { appName: 'app-2', id: 'app-2:1' },
      ],
    });
    expect(fixture.onLifecycleEvent).toHaveBeenNthCalledWith(3, {
      phase: 'unmounted',
      session: {
        appName: 'app-2',
        id: 'app-2:1',
      },
      activeSessions: [{ appName: 'app-1', id: 'app-1:1' }],
    });

    await act(async () => finishDispose?.());
    expect(fixture.onLifecycleEvent).toHaveBeenCalledTimes(4);
    expect(fixture.onLifecycleEvent).toHaveBeenNthCalledWith(4, {
      phase: 'unmounted',
      session: {
        appName: 'app-1',
        id: 'app-1:1',
      },
      activeSessions: [],
    });
    rendered.unmount();
  });

  it('runs callbacks on each last close while retaining evaluated app resources', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const rendered = renderSessions(fixture.runtime);
    const disposeCalls: string[] = [];
    const callbackCounts: number[] = [];
    const listenerCounts = [fixture.listenerCount];
    const context = getMicroFrontendRuntimeContext();
    context.dispose('app-1', () => {
      disposeCalls.push('first');
    });
    context.dispose('app-1', () => {
      disposeCalls.push('second');
    });
    const sharedModule = { version: '19' };
    registerShared('react', sharedModule);
    const appContainer = createContainer('app-1');
    const appModule = { default: () => 'app-1' };
    exposeModule(appContainer, './App', appModule);
    const unrelatedContainer = createContainer('app-2');
    registerPendingHostComponentRoute('/product', {
      app: { host: 'app', name: 'app-1', scheme: 'granite' },
      component: AppPendingComponent,
    });
    const canonicalContext = getMicroFrontendGlobalContext();
    const appLegacyContainer = canonicalContext.__INSTANCES__[0];
    const unrelatedLegacyContainer = canonicalContext.__INSTANCES__[1];

    // When
    act(() => {
      openSession(fixture, 'app-1', 'app-1:1');
      openSession(fixture, 'app-1', 'app-1:2');
      openSession(fixture, 'app-2', 'app-2:1');
    });
    await expect(fixture.runtime.importApp('app-1/App')).resolves.toBe(appModule);
    const firstSession = rendered.current[0];
    act(() => fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:2' } }));
    expect(rendered.current.map(({ sessionId }) => sessionId)).toEqual(['app-1:1', 'app-2:1']);
    expect(disposeCalls).toEqual([]);
    callbackCounts.push(disposeCalls.length / 2);
    await act(async () => fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:1' } }));
    expect(rendered.current.map(({ sessionId }) => sessionId)).toEqual(['app-2:1']);
    expect(disposeCalls).toEqual(['second', 'first']);
    callbackCounts.push(disposeCalls.length / 2);
    act(() => openSession(fixture, 'app-1', 'app-1:3'));
    const reopenedSession = rendered.current.find(({ sessionId }) => sessionId === 'app-1:3');
    expect(reopenedSession).toBeDefined();
    expect(reopenedSession).not.toBe(firstSession);
    expect(reopenedSession?.isVisible).toBe(false);
    act(() => {
      fixture.emit({
        name: 'sessionVisibilityChanged',
        params: { sessionId: 'app-1:3', isVisible: true },
      });
    });
    expect(rendered.current.find(({ sessionId }) => sessionId === 'app-1:3')?.isVisible).toBe(true);
    await expect(fixture.runtime.importApp('app-1/App')).resolves.toBe(appModule);
    await act(async () => {
      fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:3' } });
      fixture.emit({ name: 'closeApp', params: { sessionId: 'app-1:3' } });
      fixture.emit({
        name: 'sessionVisibilityChanged',
        params: { sessionId: 'app-1:3', isVisible: true },
      });
    });

    // Then
    expect(rendered.current.map(({ sessionId }) => sessionId)).toEqual(['app-2:1']);
    expect(disposeCalls).toEqual(['second', 'first', 'second', 'first']);
    callbackCounts.push(disposeCalls.length / 2);
    expect(callbackCounts).toEqual([0, 1, 2]);
    expect(globalThis.__MICRO_FRONTEND__).toBe(canonicalContext);
    expect(canonicalContext.__CONTAINERS__['app-1']).toBe(appContainer);
    expect(canonicalContext.__CONTAINERS__['app-2']).toBe(unrelatedContainer);
    expect(canonicalContext.__INSTANCES__[0]).toBe(appLegacyContainer);
    expect(canonicalContext.__INSTANCES__[1]).toBe(unrelatedLegacyContainer);
    expect(context.sharedModules.react?.get()).toBe(sharedModule);
    expect(appContainer.exposedModules['./App']).toBe(appModule);
    expect(resolvePendingHostComponent('granite://app/app-1/product')?.component).toBe(AppPendingComponent);
    expect(fixture.adapter.loadBundle).toHaveBeenCalledOnce();
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledOnce();
    rendered.unmount();
    listenerCounts.push(fixture.listenerCount);
    const remounted = renderSessions(fixture.runtime);
    listenerCounts.push(fixture.listenerCount);
    expect(remounted.current).toEqual([]);
    remounted.unmount();
    listenerCounts.push(fixture.listenerCount);
    expect(listenerCounts).toEqual([1, 0, 1, 0]);
  });
});
