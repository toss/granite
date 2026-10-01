import type { NativeRNComponentEvent } from '../specs/NativeGraniteRNComponentSessions';
import type {
  RNComponentContentSize,
  RNComponentEvent,
  RNComponentSessionState,
  RNComponentSessionSubscription,
} from '../types';
import { createComponentSessionStore } from './componentSessionStore';

/** The members of the native module that the client uses. */
export interface NativeRNComponentSessions {
  readonly startEventDelivery: () => void;
  readonly onEvent: (listener: (event: NativeRNComponentEvent) => void) => RNComponentSessionSubscription;
  readonly reportContentSize: (request: {
    readonly sessionId: string;
    readonly width: number;
    readonly height: number;
  }) => void;
}

export interface CreateComponentSessionClientDependencies {
  /** Returns `null` when the app does not include the native module. */
  readonly getNativeModule: () => NativeRNComponentSessions | null;
  readonly parseEvent: (event: NativeRNComponentEvent) => RNComponentEvent;
}

export interface ComponentSessionClient {
  /** Reads the current component sessions without starting native event delivery. */
  readonly getSessions: () => readonly RNComponentSessionState[];
  /**
   * Subscribes to changes and starts native event delivery if needed; read `getSessions()` for the initial snapshot.
   * Without the native module, no session ever opens.
   */
  readonly onSessionsChanged: (
    listener: (sessions: readonly RNComponentSessionState[]) => void
  ) => RNComponentSessionSubscription;
  /** Reports the measured content size of a component session to its native view. */
  readonly reportContentSize: (sessionId: string, size: RNComponentContentSize) => void;
}

/** Mirrors the component sessions that native views open, and starts native delivery on the first subscription. */
export function createComponentSessionClient(
  dependencies: CreateComponentSessionClientDependencies
): ComponentSessionClient {
  const store = createComponentSessionStore();
  const listeners = new Set<(sessions: readonly RNComponentSessionState[]) => void>();
  let nativeSubscription: RNComponentSessionSubscription | undefined;

  function startEventDelivery() {
    if (nativeSubscription != null) {
      return;
    }
    const nativeModule = dependencies.getNativeModule();
    if (nativeModule == null) {
      return;
    }
    // Subscribe before starting so the open components the native module sends on start are not lost.
    nativeSubscription = nativeModule.onEvent((event) => {
      if (store.applyEvent(dependencies.parseEvent(event))) {
        notifyListeners(listeners, store.getSessions());
      }
    });
    nativeModule.startEventDelivery();
  }

  return {
    getSessions: store.getSessions,
    onSessionsChanged(listener) {
      const callback = (sessions: readonly RNComponentSessionState[]) => listener(sessions);
      listeners.add(callback);
      startEventDelivery();
      return { remove: () => listeners.delete(callback) };
    },
    reportContentSize(sessionId, size) {
      dependencies.getNativeModule()?.reportContentSize({ sessionId, width: size.width, height: size.height });
    },
  };
}

function notifyListeners<TEvent>(listeners: ReadonlySet<(event: TEvent) => void>, event: TEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('Failed to run an RNComponentView session listener', error);
    }
  });
}
