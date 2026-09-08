import type { SessionStore } from '../session/sessionStore';
import type { MicroFrontendLifecycleEvent } from '../types';

const sessionsByRuntime = new WeakMap<object, SessionStore>();

export function setMicroFrontendSessionStore(runtime: object, store: SessionStore): void {
  sessionsByRuntime.set(runtime, store);
}

export function emitMicroFrontendLifecycleEvent(runtime: object, event: MicroFrontendLifecycleEvent): void {
  sessionsByRuntime.get(runtime)?.emit(event);
}
