import { vi } from 'vitest';
import {
  createComponentSessionClient,
  type NativeRNComponentSessions,
} from '../src/sessions/createComponentSessionClient';
import { parseNativeComponentEvent } from '../src/sessions/parseNativeComponentEvent';
import type { NativeRNComponentEvent } from '../src/specs/NativeGraniteRNComponentSessions';

export interface ComponentSessionFixtureOptions {
  /** Whether the app includes the native module. Defaults to true. */
  readonly hasNativeModule?: boolean;
}

export function createComponentSessionFixture(options: ComponentSessionFixtureOptions = {}) {
  const listeners = new Set<(event: NativeRNComponentEvent) => void>();
  // Like the native module, open components wait for a renderer and arrive as a snapshot when it starts.
  const openComponents = new Map<string, NativeRNComponentEvent>();
  let isDelivering = false;
  const nativeModule = {
    onEvent: vi.fn((listener: (event: NativeRNComponentEvent) => void) => {
      listeners.add(listener);
      return { remove: () => listeners.delete(listener) };
    }),
    startEventDelivery: vi.fn(() => {
      isDelivering = true;
      openComponents.forEach((event) => listeners.forEach((listener) => listener(event)));
    }),
    reportContentSize: vi.fn(),
  } satisfies NativeRNComponentSessions;
  const client = createComponentSessionClient({
    getNativeModule: () => ((options.hasNativeModule ?? true) ? nativeModule : null),
    parseEvent: parseNativeComponentEvent,
  });
  const runtime = { evaluateScript: vi.fn<(filePath: string) => Promise<void>>(async () => undefined) };

  return {
    client,
    nativeModule,
    runtime,
    emitEvent(event: NativeRNComponentEvent) {
      const sessionId = event.params.sessionId;
      if (event.name === 'openComponent') {
        openComponents.set(sessionId, event);
      } else if (event.name === 'closeComponent') {
        openComponents.delete(sessionId);
      }
      if (isDelivering) {
        listeners.forEach((listener) => listener(event));
      }
    },
  };
}
