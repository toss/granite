import type { AppContainer } from './registry';

/**
 * Copies of each app's modules and the session each copy belongs to (instance per session).
 *
 * A copy is a container: an app's first evaluation, which native ran, or an instance made from the app's container
 * definition. Every copy has its own `instanceId` (`<appName>@<n>`, see instanceIds.ts) and module state.
 *
 * A session takes a copy of its app that no session has used yet (for example one a preload made), or a new
 * instance, and keeps it for the copy's lifetime: a copy never goes to another session, also after its session
 * closed. So late work of a closed screen cannot reach a later screen, and every screen starts with its own module
 * state. A copy with no owner yet acts for the host.
 */
export interface AppCopy {
  readonly instanceId: string;
  readonly appName: string;
  readonly sourceUrl?: string;
  /** Creation order, across apps. */
  readonly order: number;
  /** The session this copy belongs to. Set once, never changed. */
  owner?: string;
  /** Set when the copy's modules have run and registered the container. */
  container?: AppContainer;
}

const copies = new Map<string, AppCopy>();
/** The session that waits for the copy of an app that initializes now. Its copy belongs to it from the start. */
const pendingOwners = new Map<string, string>();
let createdCopies = 0;

/** `initContainer`: a copy's modules are about to run. */
export function recordCopy(instanceId: string, appName: string, sourceUrl: string | undefined): void {
  if (copies.has(instanceId)) {
    return;
  }
  const owner = pendingOwners.get(appName);
  pendingOwners.delete(appName);
  createdCopies += 1;
  copies.set(instanceId, { instanceId, appName, sourceUrl, order: createdCopies, owner });
}

/** The session the copy belongs to, or undefined while no session has taken it (it acts for the host). */
export function ownerOf(instanceId: string): string | undefined {
  return copies.get(instanceId)?.owner;
}

export function attachContainer(instanceId: string, container: AppContainer): void {
  const copy = copies.get(instanceId);
  if (copy != null && copy.container == null) {
    copy.container = container;
  }
}

export function getCopy(instanceId: string): AppCopy | undefined {
  return copies.get(instanceId);
}

export function hasCopies(appName: string): boolean {
  return [...copies.values()].some((copy) => copy.appName === appName);
}

/** Runs `run` while `sessionId` waits for a copy of the app, so the copy that initializes meanwhile is its own. */
export async function withPendingOwner<T>(appName: string, sessionId: string, run: () => Promise<T>): Promise<T> {
  pendingOwners.set(appName, sessionId);
  try {
    return await run();
  } finally {
    if (pendingOwners.get(appName) === sessionId) {
      pendingOwners.delete(appName);
    }
  }
}

export function withPendingOwnerSync<T>(appName: string, sessionId: string | undefined, run: () => T): T {
  if (sessionId == null) {
    return run();
  }
  pendingOwners.set(appName, sessionId);
  try {
    return run();
  } finally {
    if (pendingOwners.get(appName) === sessionId) {
      pendingOwners.delete(appName);
    }
  }
}

export function findOwnedCopy(appName: string, sessionId: string): AppCopy | undefined {
  return [...copies.values()].find(
    (copy) => copy.appName === appName && copy.owner === sessionId && copy.container != null
  );
}

/**
 * A copy of the app no session has taken. Only copies of the app's newest bundle source qualify: sessions must not
 * stay on an older deployment once a newer one is evaluated. Among those, the oldest wins.
 */
export function findUnusedCopy(appName: string): AppCopy | undefined {
  const ready = [...copies.values()].filter((copy) => copy.appName === appName && copy.container != null);
  const newestSource = [...ready].sort((a, b) => b.order - a.order)[0]?.sourceUrl;
  return ready
    .filter((copy) => copy.owner == null && copy.sourceUrl === newestSource)
    .sort((a, b) => a.order - b.order)[0];
}

export function assignOwner(copy: AppCopy, sessionId: string): void {
  if (copy.owner != null && copy.owner !== sessionId) {
    throw new Error(`Copy ${copy.instanceId} already belongs to session ${copy.owner}`);
  }
  copy.owner = sessionId;
}

/** Test helper: forgets every copy. */
export function resetAppCopies(): void {
  copies.clear();
  pendingOwners.clear();
  createdCopies = 0;
}
