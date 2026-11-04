import type { ExecutionToken } from './context';
import { getMicroFrontendGlobalContext } from '../runtime/globalContext';

export const SESSION_EXECUTION_TOKEN = Symbol.for('granite.microFrontend.sessionExecutionToken');
const STORE_KEY = 'microFrontendExecutionSessions';

export interface ExecutionSessions {
  readonly version: 1;
  get(sessionId: string): ExecutionToken | null;
  bind(sessionId: string, executionId: string): ExecutionToken;
  release(sessionId: string, executionId: string): boolean;
  subscribe(sessionId: string, listener: () => void): () => void;
}

export function createExecutionSessions(): ExecutionSessions {
  const current = new Map<string, ExecutionToken>();
  // Retain only opaque IDs, not Activities or registries, to prevent lifetime-ID reuse.
  const issued = new Set<string>();
  const listeners = new Map<string, Set<() => void>>();
  function notify(sessionId: string): void {
    for (const listener of [...(listeners.get(sessionId) ?? [])]) {
      listener();
    }
  }

  return Object.freeze({
    version: 1,
    get: (sessionId: string) => current.get(sessionId) ?? null,
    bind(sessionId: string, executionId: string): ExecutionToken {
      if (sessionId.length === 0 || executionId.length === 0) {
        throw new Error('Execution ownership requires nonempty session and lifetime IDs');
      }
      const previous = current.get(sessionId);
      if (previous?.id === executionId) {
        return previous;
      }
      if (issued.has(executionId)) {
        throw new Error('Execution lifetime IDs cannot be reused');
      }
      const token = Object.freeze({ id: executionId });
      issued.add(executionId);
      current.set(sessionId, token);
      notify(sessionId);
      return token;
    },
    release(sessionId: string, executionId: string): boolean {
      if (current.get(sessionId)?.id !== executionId) {
        return false;
      }
      current.delete(sessionId);
      notify(sessionId);
      return true;
    },
    subscribe(sessionId: string, listener: () => void): () => void {
      let subscribers = listeners.get(sessionId);
      if (subscribers == null) {
        subscribers = new Set();
        listeners.set(sessionId, subscribers);
      }
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
        if (subscribers.size === 0 && listeners.get(sessionId) === subscribers) {
          listeners.delete(sessionId);
        }
      };
    },
  });
}

export function getExecutionSessions(): ExecutionSessions {
  const globalContext = getMicroFrontendGlobalContext();
  const installed: unknown = Reflect.get(globalContext, STORE_KEY);
  if (installed != null) {
    if (
      typeof installed !== 'object' ||
      Reflect.get(installed, 'version') !== 1 ||
      ['get', 'bind', 'release', 'subscribe'].some((name) => typeof Reflect.get(installed, name) !== 'function')
    ) {
      throw new Error('Incompatible execution session store');
    }
    return installed as ExecutionSessions;
  }
  const store = createExecutionSessions();
  Object.defineProperty(globalContext, STORE_KEY, { value: store });
  return store;
}
