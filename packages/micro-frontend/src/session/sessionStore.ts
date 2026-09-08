import { createNavigationContainerRef, type ParamListBase } from '@granite-js/native/@react-navigation/native';
import type {
  MicroFrontendLifecycleCallback,
  MicroFrontendLifecycleEvent,
  MicroFrontendLifecycleSession,
} from '../types';
import { runSessionCallback } from './sessionCallbacks';
import type { MicroFrontendSessionHandle, MicroFrontendSessions, MicroFrontendSessionSubscriber } from './sessionTypes';

interface SessionEntry {
  readonly handle: MicroFrontendSessionHandle;
  readonly listeners: Set<MicroFrontendLifecycleCallback>;
  status: 'opening' | 'mounted' | 'closing' | 'closed';
}

interface Observer {
  readonly subscriber: MicroFrontendSessionSubscriber;
  readonly cleanups: Map<SessionEntry, (() => void) | undefined>;
  active: boolean;
}

export interface SessionStore {
  readonly sessions: MicroFrontendSessions;
  readonly open: (session: MicroFrontendLifecycleSession) => void;
  readonly close: (sessionId: string) => void;
  readonly emit: (event: MicroFrontendLifecycleEvent) => void;
}

export function createSessionStore(): SessionStore {
  const entries = new Map<string, SessionEntry>();
  const observers = new Set<Observer>();

  function cleanup(observer: Observer, entry: SessionEntry) {
    const callback = observer.cleanups.get(entry);
    observer.cleanups.delete(entry);
    if (callback != null) {
      runSessionCallback(callback);
    }
  }

  function attach(observer: Observer, entry: SessionEntry) {
    if (!observer.active || entry.status === 'closed' || observer.cleanups.has(entry)) {
      return;
    }
    observer.cleanups.set(entry, undefined);
    const callback = runSessionCallback(() => observer.subscriber(entry.handle));
    if (callback == null) {
      return;
    }
    if (observer.active && observer.cleanups.has(entry)) {
      observer.cleanups.set(entry, callback);
    } else {
      runSessionCallback(callback);
    }
  }

  function dispose(entry: SessionEntry) {
    entry.status = 'closed';
    if (entries.get(entry.handle.id) === entry) {
      entries.delete(entry.handle.id);
    }
    for (const observer of [...observers]) {
      cleanup(observer, entry);
    }
    entry.listeners.clear();
    entry.handle.navigation.current = null;
  }

  const sessions: MicroFrontendSessions = {
    get: (id) => {
      const entry = entries.get(id);
      return entry?.status === 'closing' ? undefined : entry?.handle;
    },
    getSnapshot: () => [...entries.values()].filter((entry) => entry.status !== 'closing').map((entry) => entry.handle),
    subscribe: (subscriber) => {
      const observer: Observer = { subscriber, cleanups: new Map(), active: true };
      observers.add(observer);
      for (const entry of [...entries.values()]) {
        if (entry.status !== 'closing') {
          attach(observer, entry);
        }
      }
      return () => {
        observer.active = false;
        observers.delete(observer);
        for (const entry of [...observer.cleanups.keys()]) {
          cleanup(observer, entry);
        }
      };
    },
  };

  return {
    sessions,
    open: (session) => {
      if (entries.has(session.id)) {
        return;
      }
      const listeners = new Set<MicroFrontendLifecycleCallback>();
      const entry: SessionEntry = {
        status: 'opening',
        listeners,
        handle: {
          id: session.id,
          appName: session.appName,
          navigation: createNavigationContainerRef<ParamListBase>(),
          addListener: (_event, listener) => {
            if (entry.status !== 'closed') {
              listeners.add(listener);
            }
            return () => listeners.delete(listener);
          },
        },
      };
      entries.set(session.id, entry);
      for (const observer of [...observers]) {
        attach(observer, entry);
      }
    },
    close: (id) => {
      const entry = entries.get(id);
      if (entry == null) {
        return;
      }
      if (entry.status === 'opening') {
        dispose(entry);
      } else {
        entry.status = 'closing';
      }
    },
    emit: (event) => {
      const entry = entries.get(event.session.id);
      if (entry == null) {
        return;
      }
      if (event.phase === 'mounted') {
        entry.status = 'mounted';
      }
      for (const listener of [...entry.listeners]) {
        if (entry.listeners.has(listener)) {
          runSessionCallback(() => listener(event));
        }
      }
      if (event.phase === 'unmounted') {
        dispose(entry);
      }
    },
  };
}
