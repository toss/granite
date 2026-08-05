import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MicroFrontendRuntimeEvent } from '../types';
import {
  createMicroFrontendRuntimeWithDependencies,
  type NativeMicroFrontendRuntime,
  type NativeMicroFrontendRuntimeEvent,
} from './createMicroFrontendRuntime';
import { parseNativeRuntimeEvent } from './parseNativeRuntimeEvent';
import { createContainer, exposeModule, microFrontendModuleRegistry } from './registry';

interface AppModule {
  readonly default: () => string;
}

function createRuntimeFixture() {
  const listeners = new Set<(event: NativeMicroFrontendRuntimeEvent) => void>();
  const adapter = {
    loadBundle: vi.fn(async (appName: string) => `/bundles/${appName}.hbc`),
  };
  const nativeRuntime: NativeMicroFrontendRuntime = {
    evaluateScript: vi.fn(async () => undefined),
    requestCloseSession: vi.fn(async () => undefined),
    startEventDelivery: vi.fn(),
    onEvent(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
  };
  const runtime = createMicroFrontendRuntimeWithDependencies({
    adapter,
    nativeRuntime,
    registry: microFrontendModuleRegistry,
    parseEvent: parseNativeRuntimeEvent,
  });

  return {
    adapter,
    emit: (event: NativeMicroFrontendRuntimeEvent) => {
      listeners.forEach((listener) => listener(event));
    },
    nativeRuntime,
    runtime,
  };
}

describe('createMicroFrontendRuntimeWithDependencies', () => {
  beforeEach(() => {
    Reflect.deleteProperty(globalThis, '__GRANITE_MICRO_FRONTEND__');
  });

  it('loads and evaluates an app once before importing its exposed module', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const appModule: AppModule = { default: () => 'cart' };
    vi.mocked(fixture.nativeRuntime.evaluateScript).mockImplementationOnce(async () => {
      const container = createContainer('cart');
      exposeModule(container, './App', appModule);
    });

    // When
    const [first, second] = await Promise.all([
      fixture.runtime.importApp<AppModule>('cart/App'),
      fixture.runtime.importApp<AppModule>('cart/App'),
    ]);

    // Then
    expect(first).toBe(appModule);
    expect(second).toBe(appModule);
    expect(fixture.adapter.loadBundle).toHaveBeenCalledTimes(1);
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledOnce();
    expect(fixture.nativeRuntime.evaluateScript).toHaveBeenCalledWith({
      filePath: '/bundles/cart.hbc',
    });
  });

  it('removes a failed evaluation so the next preload can retry', async () => {
    // Given
    const fixture = createRuntimeFixture();
    vi.mocked(fixture.nativeRuntime.evaluateScript)
      .mockImplementationOnce(async () => {
        createContainer('catalog');
        throw new Error('evaluation failed');
      })
      .mockImplementationOnce(async () => {
        createContainer('catalog');
      });

    // When
    const failedPreload = fixture.runtime.preloadApp('catalog');

    // Then
    await expect(failedPreload).rejects.toThrow('evaluation failed');
    expect(microFrontendModuleRegistry.hasContainer('catalog')).toBe(false);
    await expect(fixture.runtime.preloadApp('catalog')).resolves.toBeUndefined();
    expect(fixture.adapter.loadBundle).toHaveBeenCalledTimes(2);
  });

  it('delegates session close and forwards parsed native events', async () => {
    // Given
    const fixture = createRuntimeFixture();
    const listener = vi.fn<(event: MicroFrontendRuntimeEvent) => void>();
    const subscription = fixture.runtime.onEvent(listener);
    const event = {
      name: 'openApp',
      params: {
        appName: 'cart',
        scheme: 'granite://cart/products/1',
        sessionId: 'session-1',
      },
    } satisfies NativeMicroFrontendRuntimeEvent;

    // When
    fixture.emit(event);
    await fixture.runtime.closeSession('session-1');
    subscription.remove();
    fixture.emit(event);

    // Then
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(event);
    expect(fixture.nativeRuntime.requestCloseSession).toHaveBeenCalledWith({
      sessionId: 'session-1',
    });
    expect(fixture.nativeRuntime.startEventDelivery).toHaveBeenCalledOnce();
  });
});
