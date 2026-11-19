/**
 * Tells native that a closed session's React tree is gone.
 *
 * Native keeps a session's resources (for example its native module registry) until then, because the tree's own
 * teardown (effect cleanups that unsubscribe, remove listeners) still acts for that session.
 */
const sessionUnmountHandlerByRuntime = new WeakMap<object, (sessionId: string) => void>();

export function setSessionUnmountHandler(runtime: object, handler: (sessionId: string) => void): void {
  sessionUnmountHandlerByRuntime.set(runtime, handler);
}

/**
 * Called by the component that renders the sessions, from an effect after a commit that removed them. React runs
 * every cleanup of the removed subtrees before the effects of components that stay, so the session's teardown is done.
 */
export function notifySessionUnmounted(runtime: object, sessionId: string): void {
  const handler = sessionUnmountHandlerByRuntime.get(runtime);
  if (handler == null) {
    return;
  }

  try {
    handler(sessionId);
  } catch (error) {
    console.error(`Failed to report the unmount of micro-frontend session '${sessionId}'`, error);
  }
}
