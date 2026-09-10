import { vi } from 'vitest';
import {
  createMicroFrontendRuntimeWithDependencies,
  type NativeMicroFrontendRuntime,
  type NativeMicroFrontendRuntimeEvent,
} from '../src/runtime/createMicroFrontendRuntime';
import { parseNativeRuntimeEvent } from '../src/runtime/parseNativeRuntimeEvent';

export function createSessionRuntimeFixture() {
  const listeners = new Set<(event: NativeMicroFrontendRuntimeEvent) => void>();
  const queuedEvents: NativeMicroFrontendRuntimeEvent[] = [];
  let isDelivering = false;
  const nativeRuntime: NativeMicroFrontendRuntime = {
    evaluateScript: vi.fn(async () => undefined),
    onEvent(listener) {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    },
    startEventDelivery: vi.fn(() => {
      isDelivering = true;
      queuedEvents.splice(0).forEach((event) => listeners.forEach((listener) => listener(event)));
    }),
  };
  const adapter = { loadBundle: vi.fn(async () => ({ filePath: '/bundles/example.hbc' })) };
  const runtime = createMicroFrontendRuntimeWithDependencies({
    adapter,
    nativeRuntime,
    onPreloadError: vi.fn(),
    registry: {
      hasContainer: () => true,
      removeContainer: vi.fn(),
      importModule: () => {
        throw new Error('No exposed module in this fixture');
      },
    },
    removePendingHostComponentRoutes: vi.fn(),
    parseEvent: parseNativeRuntimeEvent,
  });
  return {
    runtime,
    adapter,
    nativeRuntime,
    emit(event: NativeMicroFrontendRuntimeEvent) {
      if (isDelivering) {
        listeners.forEach((listener) => listener(event));
      } else {
        queuedEvents.push(event);
      }
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}
