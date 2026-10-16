import { resolvePendingHostComponentParams } from './resolveParams';
import {
  createPendingHostComponentRoutePrefix,
  getQueryParamsFromUrl,
  getRoutePathFromUrl,
  matchRoutePath,
  normalizePendingHostComponentAppName,
  normalizeRoutePath,
} from './routeMatcher';
import type {
  PendingHostComponentRenderer,
  PendingHostComponentRouteRequest,
  RegisterPendingHostComponentRouteOptions,
  ResolvedPendingHostComponent,
  ValidateParams,
} from './types';
import { getMicroFrontendGlobalContext, MicroFrontendGlobalContextCompatibilityError } from '../runtime/globalContext';

interface PendingHostComponentRouteEntry {
  readonly id: string;
  readonly routePath: string;
  readonly routePrefix: string;
  readonly appName: string;
  readonly component: PendingHostComponentRenderer<Readonly<object>>;
  readonly parserParams?: (params: Record<string, unknown>) => Record<string, unknown>;
  readonly validateParams?: ValidateParams<Readonly<object> | undefined>;
}

interface MatchedPendingHostComponentRoute {
  readonly entry: PendingHostComponentRouteEntry;
  readonly pathParams: Record<string, string>;
  readonly params: Record<string, unknown>;
  readonly routePath: string;
  readonly url: string | null;
}

interface PendingHostComponentStore {
  entries: PendingHostComponentRouteEntry[];
  hidden: boolean;
  sessionHidden?: Map<string, boolean>;
  readonly listeners: Set<() => void>;
  version: number;
}

const PENDING_STORE_KEY = 'pendingHostComponentStore';
const HIDE_SHARED_PENDING_HOST_COMPONENT_KEY = 'hideSharedPendingHostComponent';

function getPendingHostComponentStore(): PendingHostComponentStore {
  const context = getMicroFrontendGlobalContext();
  const descriptor = Reflect.getOwnPropertyDescriptor(context, PENDING_STORE_KEY);
  if (descriptor != null) {
    if (!isPendingHostComponentStore(descriptor.value)) {
      throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-not-adoptable');
    }
    return descriptor.value;
  }

  const store = createPendingHostComponentStore();

  if (
    !Reflect.defineProperty(context, PENDING_STORE_KEY, {
      configurable: true,
      enumerable: false,
      value: store,
      writable: true,
    })
  ) {
    throw new MicroFrontendGlobalContextCompatibilityError('canonical-global-is-not-adoptable');
  }

  return store;
}

function createPendingHostComponentStore(): PendingHostComponentStore {
  return { entries: [], hidden: false, listeners: new Set(), version: 0 };
}

function isPendingHostComponentStore(value: unknown): value is PendingHostComponentStore {
  return (
    typeof value === 'object' &&
    value != null &&
    Array.isArray(Reflect.get(value, 'entries')) &&
    typeof Reflect.get(value, 'hidden') === 'boolean' &&
    Reflect.get(value, 'listeners') instanceof Set &&
    typeof Reflect.get(value, 'version') === 'number'
  );
}

function emitPendingHostComponentStoreChange() {
  const store = getPendingHostComponentStore();
  store.version += 1;
  store.listeners.forEach((listener) => listener());
}

export function subscribePendingHostComponentStore(listener: () => void) {
  const store = getPendingHostComponentStore();
  store.listeners.add(listener);

  return () => store.listeners.delete(listener);
}

export function getPendingHostComponentStoreVersion() {
  return getPendingHostComponentStore().version;
}

function getSessionHidden() {
  const store = getPendingHostComponentStore();
  // Adopt stores created by older package copies without replacing their listeners.
  return (store.sessionHidden ??= new Map<string, boolean>());
}

export function getIsPendingHostComponentHidden(sessionId?: string) {
  return sessionId == null ? getPendingHostComponentStore().hidden : (getSessionHidden().get(sessionId) ?? false);
}

/** @internal Called once for each accepted native open event, before notifying React. */
export function openPendingHostComponentSession(sessionId: string) {
  const sessions = getSessionHidden();
  if (sessions.has(sessionId)) {
    return;
  }
  sessions.set(sessionId, false);
  getPendingHostComponentStore().hidden = false;
  installPendingHostComponentBridge();
  emitPendingHostComponentStoreChange();
}

/** @internal Closing a session releases its state; visibility changes do not. */
export function closePendingHostComponentSession(sessionId: string) {
  if (getSessionHidden().delete(sessionId)) {
    emitPendingHostComponentStoreChange();
  }
}

function setPendingHostComponentHidden(hidden: boolean) {
  const store = getPendingHostComponentStore();

  if (store.hidden === hidden) {
    return;
  }

  store.hidden = hidden;
  emitPendingHostComponentStoreChange();
}

// Retain assignability to callbacks that supply an event or a promise result.
export function hidePendingHostComponent(): void;
export function hidePendingHostComponent(sessionId?: string): void;
export function hidePendingHostComponent(sessionId?: unknown) {
  const sessions = getSessionHidden();
  const latest = Array.from(sessions.keys()).at(-1);
  const scoped = typeof sessionId === 'string';
  // Unscoped callers retain legacy behavior, targeting the latest open session.
  // Async work should always pass its originating session ID.
  const target = scoped ? sessionId : latest;
  if (target != null) {
    if (!sessions.has(target)) {
      return;
    }
    const store = getPendingHostComponentStore();
    const updateLegacy = target === latest && !store.hidden;
    const updateSession = sessions.get(target) === false;
    sessions.set(target, true);
    if (updateLegacy) {
      store.hidden = true;
    }
    if (updateSession || updateLegacy) {
      emitPendingHostComponentStoreChange();
    }
    return;
  }
  setPendingHostComponentHidden(true);

  const hideSharedPendingHostComponent = Reflect.get(globalThis, HIDE_SHARED_PENDING_HOST_COMPONENT_KEY);
  if (
    typeof hideSharedPendingHostComponent === 'function' &&
    hideSharedPendingHostComponent !== hidePendingHostComponent
  ) {
    hideSharedPendingHostComponent();
  }
}

export function resetPendingHostComponent() {
  setPendingHostComponentHidden(false);
}

export function installPendingHostComponentBridge() {
  Reflect.set(globalThis, HIDE_SHARED_PENDING_HOST_COMPONENT_KEY, hidePendingHostComponent);
}

export function registerPendingHostComponentRoute<TParams extends Readonly<object> | undefined = undefined>(
  routePath: string,
  options: RegisterPendingHostComponentRouteOptions<TParams>
) {
  const store = getPendingHostComponentStore();
  const normalizedRoutePath = normalizeRoutePath(routePath);
  const appName = normalizePendingHostComponentAppName(options.app.name);
  const routePrefix = createPendingHostComponentRoutePrefix(options.app);
  const id = `${routePrefix}:${normalizedRoutePath}`;
  const entry: PendingHostComponentRouteEntry = {
    id,
    routePath: normalizedRoutePath,
    routePrefix,
    appName,
    component: options.component,
    parserParams: options.parserParams,
    validateParams: options.validateParams,
  };
  const existingIndex = store.entries.findIndex((item) => item.id === id);

  if (existingIndex >= 0) {
    store.entries[existingIndex] = entry;
  } else {
    store.entries.push(entry);
  }

  emitPendingHostComponentStoreChange();
}

export function removePendingHostComponentRoutes(appName: string) {
  const store = getPendingHostComponentStore();
  const normalizedAppName = normalizePendingHostComponentAppName(appName);
  const remainingEntries = store.entries.filter((entry) => entry.appName !== normalizedAppName);

  if (remainingEntries.length === store.entries.length) {
    return;
  }

  store.entries = remainingEntries;
  emitPendingHostComponentStoreChange();
}

export function resolvePendingHostComponent(
  request: PendingHostComponentRouteRequest | string
): ResolvedPendingHostComponent | null {
  const matched = typeof request === 'string' ? findRouteByUrl(request) : findRouteByRequest(request);

  return resolveMatchedPendingHostComponent(matched);
}

function resolveMatchedPendingHostComponent(
  matched: MatchedPendingHostComponentRoute | null
): ResolvedPendingHostComponent | null {
  if (matched == null) {
    return null;
  }

  const params = resolvePendingHostComponentParams(
    { ...matched.pathParams, ...matched.params },
    matched.entry.parserParams,
    matched.entry.validateParams
  );

  if (params.status === 'invalid') {
    return null;
  }

  return {
    component: matched.entry.component,
    params: params.value,
    url: matched.url,
    routePath: matched.routePath,
    appName: matched.entry.appName,
  };
}

function findRouteByUrl(url: string): MatchedPendingHostComponentRoute | null {
  const entries = getPendingHostComponentStore().entries;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry == null) {
      continue;
    }

    const routePath = getRoutePathFromUrl(url, entry.routePrefix);
    const pathParams = routePath == null ? null : matchRoutePath(entry.routePath, routePath);
    if (routePath == null || pathParams == null) {
      continue;
    }

    return { entry, pathParams, params: getQueryParamsFromUrl(url), routePath, url };
  }

  return null;
}

function findRouteByRequest(request: PendingHostComponentRouteRequest): MatchedPendingHostComponentRoute | null {
  const appName = normalizePendingHostComponentAppName(request.appName);

  for (let index = getPendingHostComponentStore().entries.length - 1; index >= 0; index -= 1) {
    const entry = getPendingHostComponentStore().entries[index];
    if (entry == null || entry.appName !== appName) {
      continue;
    }

    const routePath = normalizeRoutePath(request.routePath);
    const pathParams = matchRoutePath(entry.routePath, routePath);
    if (pathParams == null) {
      continue;
    }

    return {
      entry,
      pathParams,
      params: request.params ?? {},
      routePath,
      url: request.url ?? null,
    } satisfies MatchedPendingHostComponentRoute;
  }

  return null;
}

export function resetPendingHostComponentStoreForTest() {
  const store = getPendingHostComponentStore();
  store.entries = [];
  store.sessionHidden?.clear();
  store.hidden = false;
  store.version = 0;
  emitPendingHostComponentStoreChange();
}
