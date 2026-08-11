import { resolveHostSkeletonParams } from './resolveParams';
import {
  createHostSkeletonRoutePrefix,
  getQueryParamsFromUrl,
  getRoutePathFromUrl,
  matchRoutePath,
  normalizeHostSkeletonAppName,
  normalizeRoutePath,
} from './routeMatcher';
import type {
  HostSkeletonComponent,
  HostSkeletonRouteRequest,
  RegisterHostSkeletonRouteOptions,
  ResolvedHostSkeleton,
  ValidateParams,
} from './types';

interface HostSkeletonRouteEntry {
  readonly id: string;
  readonly routePath: string;
  readonly routePrefix: string;
  readonly appName: string;
  readonly component: HostSkeletonComponent<Readonly<object>>;
  readonly parserParams?: (params: Record<string, unknown>) => Record<string, unknown>;
  readonly validateParams?: ValidateParams<Readonly<object> | undefined>;
}

interface MatchedHostSkeletonRoute {
  readonly entry: HostSkeletonRouteEntry;
  readonly pathParams: Record<string, string>;
  readonly params: Record<string, unknown>;
  readonly routePath: string;
  readonly url: string | null;
}

interface HostSkeletonStore {
  entries: HostSkeletonRouteEntry[];
  hidden: boolean;
  readonly listeners: Set<() => void>;
  version: number;
}

interface GlobalWithHostSkeletonStore {
  __graniteMicroFrontendHostSkeletonStore?: HostSkeletonStore;
  hideSharedSkeleton?: () => void;
}

function getGlobalObject() {
  return globalThis as typeof globalThis & GlobalWithHostSkeletonStore;
}

function getHostSkeletonStore() {
  const globalObject = getGlobalObject();

  if (globalObject.__graniteMicroFrontendHostSkeletonStore == null) {
    globalObject.__graniteMicroFrontendHostSkeletonStore = {
      entries: [],
      hidden: false,
      listeners: new Set(),
      version: 0,
    };
  }

  return globalObject.__graniteMicroFrontendHostSkeletonStore;
}

function emitHostSkeletonStoreChange() {
  const store = getHostSkeletonStore();
  store.version += 1;
  store.listeners.forEach(listener => listener());
}

export function subscribeHostSkeletonStore(listener: () => void) {
  const store = getHostSkeletonStore();
  store.listeners.add(listener);

  return () => store.listeners.delete(listener);
}

export function getHostSkeletonStoreVersion() {
  return getHostSkeletonStore().version;
}

export function getIsHostSkeletonHidden() {
  return getHostSkeletonStore().hidden;
}

function setHostSkeletonHidden(hidden: boolean) {
  const store = getHostSkeletonStore();

  if (store.hidden === hidden) {
    return;
  }

  store.hidden = hidden;
  emitHostSkeletonStoreChange();
}

export function hideHostSkeleton() {
  setHostSkeletonHidden(true);

  const hideSharedSkeleton = getGlobalObject().hideSharedSkeleton;
  if (typeof hideSharedSkeleton === 'function' && hideSharedSkeleton !== hideHostSkeleton) {
    hideSharedSkeleton();
  }
}

export function resetHostSkeleton() {
  setHostSkeletonHidden(false);
}

export function installHostSkeletonBridge() {
  getGlobalObject().hideSharedSkeleton = hideHostSkeleton;
}

export function registerHostSkeletonRoute<
  TParams extends Readonly<object> | undefined = undefined,
>(routePath: string, options: RegisterHostSkeletonRouteOptions<TParams>) {
  const store = getHostSkeletonStore();
  const normalizedRoutePath = normalizeRoutePath(routePath);
  const appName = normalizeHostSkeletonAppName(options.app.name);
  const routePrefix = createHostSkeletonRoutePrefix(options.app);
  const id = `${routePrefix}:${normalizedRoutePath}`;
  const entry: HostSkeletonRouteEntry = {
    id,
    routePath: normalizedRoutePath,
    routePrefix,
    appName,
    component: options.component,
    parserParams: options.parserParams,
    validateParams: options.validateParams,
  };
  const existingIndex = store.entries.findIndex(item => item.id === id);

  if (existingIndex >= 0) {
    store.entries[existingIndex] = entry;
  } else {
    store.entries.push(entry);
  }

  emitHostSkeletonStoreChange();
}

export function removeHostSkeletonRoutes(appName: string) {
  const store = getHostSkeletonStore();
  const normalizedAppName = normalizeHostSkeletonAppName(appName);
  const remainingEntries = store.entries.filter(entry => entry.appName !== normalizedAppName);

  if (remainingEntries.length === store.entries.length) {
    return;
  }

  store.entries = remainingEntries;
  emitHostSkeletonStoreChange();
}

export function resolveHostSkeleton(request: HostSkeletonRouteRequest | string): ResolvedHostSkeleton | null {
  const matched = typeof request === 'string' ? findRouteByUrl(request) : findRouteByRequest(request);

  return resolveMatchedHostSkeleton(matched);
}

function resolveMatchedHostSkeleton(matched: MatchedHostSkeletonRoute | null): ResolvedHostSkeleton | null {
  if (matched == null) {
    return null;
  }

  const params = resolveHostSkeletonParams(
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

function findRouteByUrl(url: string): MatchedHostSkeletonRoute | null {
  const entries = getHostSkeletonStore().entries;

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

function findRouteByRequest(request: HostSkeletonRouteRequest): MatchedHostSkeletonRoute | null {
  const appName = normalizeHostSkeletonAppName(request.appName);

  for (let index = getHostSkeletonStore().entries.length - 1; index >= 0; index -= 1) {
    const entry = getHostSkeletonStore().entries[index];
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
    } satisfies MatchedHostSkeletonRoute;
  }

  return null;
}

export function resetHostSkeletonStoreForTest() {
  const store = getHostSkeletonStore();
  store.entries = [];
  store.hidden = false;
  store.version = 0;
  emitHostSkeletonStoreChange();
}
