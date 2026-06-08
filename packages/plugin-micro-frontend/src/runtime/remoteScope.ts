import type { Container } from './types';

export const MICRO_FRONTEND_REMOTE_CONTEXT_KEY = '__GRANITE_MICRO_FRONTEND_REMOTE__';

type ResourceName = 'timeouts' | 'intervals' | 'animationFrames';

export interface RemoteScope {
  name: string;
  appName: string | null;
  container: Container | null;
  finalized: boolean;
  hostSkeletonRoutes: unknown[];
  releaseFinalizerScheduled: boolean;
  released: boolean;
  resources: Record<ResourceName, unknown[]>;
}

export interface RemoteScopeRef {
  deref(): RemoteScope | null | undefined;
}

export interface RemoteContext {
  currentScope: RemoteScope | null;
  releasedScopeNames: Record<string, true | undefined>;
  scopes: Record<string, RemoteScopeRef | undefined>;
  releaseScope?: typeof releaseRemoteScope;
  getScopedResourceScope?: typeof getScopedResourceScope;
  setScopedTimeout?: typeof setScopedTimeout;
  clearScopedTimeout?: typeof clearScopedTimeout;
  setScopedInterval?: typeof setScopedInterval;
  clearScopedInterval?: typeof clearScopedInterval;
  requestScopedAnimationFrame?: typeof requestScopedAnimationFrame;
  cancelScopedAnimationFrame?: typeof cancelScopedAnimationFrame;
}

interface RemoteGlobal {
  [MICRO_FRONTEND_REMOTE_CONTEXT_KEY]?: RemoteContext;
  setTimeout?: (...args: any[]) => unknown;
  clearTimeout?: (timeoutId: unknown) => unknown;
  setInterval?: (...args: any[]) => unknown;
  clearInterval?: (intervalId: unknown) => unknown;
  requestAnimationFrame?: (handler: (...args: any[]) => unknown) => unknown;
  cancelAnimationFrame?: (animationFrameId: unknown) => unknown;
}

export function getGlobalObject() {
  if (typeof globalThis !== 'undefined') {
    return globalThis as typeof globalThis & RemoteGlobal;
  }

  return Function('return this')() as RemoteGlobal;
}

export function getRemoteContext() {
  const globalObject = getGlobalObject();

  let remoteContext = globalObject[MICRO_FRONTEND_REMOTE_CONTEXT_KEY];

  if (remoteContext == null) {
    remoteContext = {
      currentScope: null,
      releasedScopeNames: {},
      scopes: {},
    };
  }

  remoteContext.currentScope ??= null;
  remoteContext.releasedScopeNames ??= {};
  remoteContext.scopes ??= {};

  remoteContext.releaseScope = releaseRemoteScope;
  remoteContext.getScopedResourceScope = getScopedResourceScope;
  remoteContext.setScopedTimeout = setScopedTimeout;
  remoteContext.clearScopedTimeout = clearScopedTimeout;
  remoteContext.setScopedInterval = setScopedInterval;
  remoteContext.clearScopedInterval = clearScopedInterval;
  remoteContext.requestScopedAnimationFrame = requestScopedAnimationFrame;
  remoteContext.cancelScopedAnimationFrame = cancelScopedAnimationFrame;

  globalObject[MICRO_FRONTEND_REMOTE_CONTEXT_KEY] = remoteContext;

  return remoteContext;
}

export function createScopeRef(scope: RemoteScope): RemoteScopeRef {
  if (typeof WeakRef === 'function') {
    return new WeakRef(scope);
  }

  return {
    deref() {
      return scope;
    },
  };
}

export function createRemoteScope(name: string): RemoteScope {
  const scope: RemoteScope = {
    name,
    appName: null,
    container: null,
    finalized: false,
    hostSkeletonRoutes: [],
    releaseFinalizerScheduled: false,
    released: false,
    resources: {
      timeouts: [],
      intervals: [],
      animationFrames: [],
    },
  };
  const remoteContext = getRemoteContext();

  remoteContext.currentScope = scope;
  remoteContext.scopes[name] = createScopeRef(scope);

  return scope;
}

export function getCurrentRemoteScope() {
  const remoteContext = getRemoteContext();
  const scope = remoteContext.currentScope;

  if (scope?.released === true) {
    remoteContext.currentScope = null;
    return null;
  }

  return scope;
}

export function clearCurrentRemoteScope(scope: RemoteScope) {
  const remoteContext = getRemoteContext();

  if (remoteContext.currentScope === scope) {
    remoteContext.currentScope = null;
  }
}

export function getRemoteScope(name: string) {
  const remoteContext = getRemoteContext();
  const scopeRef = remoteContext.scopes[name];
  const scope = scopeRef == null ? null : scopeRef.deref();

  if (scope == null) {
    delete remoteContext.scopes[name];
    return null;
  }

  return scope.released === true ? null : scope;
}

function getScope(scopeOrName: RemoteScope | string | null | undefined) {
  return typeof scopeOrName === 'string' ? getRemoteScope(scopeOrName) : scopeOrName;
}

function getResourceScope(scopeOrName: RemoteScope | string | null | undefined) {
  if (typeof scopeOrName !== 'string') {
    return scopeOrName;
  }

  const remoteContext = getRemoteContext();
  const scopeRef = remoteContext.scopes[scopeOrName];
  const scope = scopeRef == null ? null : scopeRef.deref();

  if (scope == null) {
    delete remoteContext.scopes[scopeOrName];
    return null;
  }

  return scope;
}

export function getScopedResourceScope(scopeOrName: RemoteScope | string | null | undefined) {
  return getResourceScope(scopeOrName);
}

function shouldDropScopedResource(scopeOrName: RemoteScope | string | null | undefined, scope: RemoteScope | null | undefined) {
  if (scope == null) {
    return typeof scopeOrName !== 'string' || getRemoteContext().releasedScopeNames[scopeOrName] === true;
  }

  return scope.released === true || scope.finalized === true;
}

function getScopeResources(scope: RemoteScope) {
  scope.resources ??= {
    timeouts: [],
    intervals: [],
    animationFrames: [],
  };

  return scope.resources;
}

function addResource(scope: RemoteScope | null | undefined, resourceName: ResourceName, resourceId: unknown) {
  if (scope == null || scope.finalized === true) {
    return;
  }

  const resourceIds = getScopeResources(scope)[resourceName];

  if (!resourceIds.includes(resourceId)) {
    resourceIds.push(resourceId);
  }
}

function removeResource(scope: RemoteScope | null | undefined, resourceName: ResourceName, resourceId: unknown) {
  if (scope == null || scope.resources == null) {
    return;
  }

  const resourceIds = scope.resources[resourceName];
  const index = resourceIds.indexOf(resourceId);

  if (index >= 0) {
    resourceIds.splice(index, 1);
  }
}

function clearResources(scope: RemoteScope, resourceName: ResourceName, clearResource: (resourceId: unknown) => void) {
  const resourceIds = scope.resources?.[resourceName];

  if (resourceIds == null) {
    return;
  }

  while (resourceIds.length > 0) {
    clearResource(resourceIds.pop());
  }
}

export function setScopedTimeout(
  scopeOrName: RemoteScope | string | null | undefined,
  handler: unknown,
  timeout?: unknown,
  ...args: unknown[]
) {
  const scope = getResourceScope(scopeOrName);
  const timeoutRef: { id: unknown } = { id: undefined };

  if (shouldDropScopedResource(scopeOrName, scope)) {
    return undefined;
  }

  const wrappedHandler =
    typeof handler === 'function'
      ? function (this: unknown, ...handlerArgs: unknown[]) {
          removeResource(scope, 'timeouts', timeoutRef.id);
          if (shouldDropScopedResource(scopeOrName, scope)) {
            return undefined;
          }

          return handler.apply(this, handlerArgs);
        }
      : handler;

  const timeoutId = getGlobalObject().setTimeout?.(...[wrappedHandler, timeout].concat(args));
  timeoutRef.id = timeoutId;
  addResource(scope, 'timeouts', timeoutId);

  return timeoutId;
}

export function clearScopedTimeout(scopeOrName: RemoteScope | string | null | undefined, timeoutId: unknown) {
  removeResource(getResourceScope(scopeOrName), 'timeouts', timeoutId);
  return getGlobalObject().clearTimeout?.(timeoutId);
}

export function setScopedInterval(
  scopeOrName: RemoteScope | string | null | undefined,
  handler: unknown,
  timeout?: unknown,
  ...args: unknown[]
) {
  const scope = getResourceScope(scopeOrName);

  if (shouldDropScopedResource(scopeOrName, scope)) {
    return undefined;
  }

  const wrappedHandler =
    typeof handler === 'function'
      ? function (this: unknown, ...handlerArgs: unknown[]) {
          if (shouldDropScopedResource(scopeOrName, scope)) {
            return undefined;
          }

          return handler.apply(this, handlerArgs);
        }
      : handler;

  const intervalId = getGlobalObject().setInterval?.(...[wrappedHandler, timeout].concat(args));

  addResource(scope, 'intervals', intervalId);

  return intervalId;
}

export function clearScopedInterval(scopeOrName: RemoteScope | string | null | undefined, intervalId: unknown) {
  removeResource(getResourceScope(scopeOrName), 'intervals', intervalId);
  return getGlobalObject().clearInterval?.(intervalId);
}

export function requestScopedAnimationFrame(scopeOrName: RemoteScope | string | null | undefined, handler: unknown) {
  const scope = getResourceScope(scopeOrName);
  const animationFrameRef: { id: unknown } = { id: undefined };

  if (shouldDropScopedResource(scopeOrName, scope)) {
    return undefined;
  }

  const wrappedHandler =
    typeof handler === 'function'
      ? function (this: unknown, ...handlerArgs: unknown[]) {
          removeResource(scope, 'animationFrames', animationFrameRef.id);
          if (shouldDropScopedResource(scopeOrName, scope)) {
            return undefined;
          }

          return handler.apply(this, handlerArgs);
        }
      : handler;

  const animationFrameId = getGlobalObject().requestAnimationFrame?.(wrappedHandler as (...args: any[]) => unknown);
  animationFrameRef.id = animationFrameId;
  addResource(scope, 'animationFrames', animationFrameId);

  return animationFrameId;
}

export function cancelScopedAnimationFrame(scopeOrName: RemoteScope | string | null | undefined, animationFrameId: unknown) {
  removeResource(getResourceScope(scopeOrName), 'animationFrames', animationFrameId);
  return getGlobalObject().cancelAnimationFrame?.(animationFrameId);
}

function finalizeRemoteScope(scope: RemoteScope) {
  const remoteContext = getRemoteContext();
  const scopeName = typeof scope.name === 'string' ? scope.name : null;

  clearResources(scope, 'timeouts', timeoutId => {
    getGlobalObject().clearTimeout?.(timeoutId);
  });
  clearResources(scope, 'intervals', intervalId => {
    getGlobalObject().clearInterval?.(intervalId);
  });
  clearResources(scope, 'animationFrames', animationFrameId => {
    getGlobalObject().cancelAnimationFrame?.(animationFrameId);
  });

  scope.finalized = true;

  if (scopeName != null) {
    const scopeRef = remoteContext.scopes[scopeName];

    if (scopeRef == null || scopeRef.deref() === scope) {
      delete remoteContext.scopes[scopeName];
    }
  }
}

function scheduleRemoteScopeFinalization(scope: RemoteScope) {
  if (scope.releaseFinalizerScheduled === true) {
    return;
  }

  scope.releaseFinalizerScheduled = true;

  if (typeof getGlobalObject().setTimeout === 'function') {
    getGlobalObject().setTimeout?.(() => {
      finalizeRemoteScope(scope);
    }, 0);
    return;
  }

  finalizeRemoteScope(scope);
}

export function releaseRemoteScope(scopeOrName: RemoteScope | string | null | undefined) {
  const remoteContext = getRemoteContext();
  const scope = getScope(scopeOrName);

  if (scope == null) {
    return false;
  }

  scope.released = true;
  const scopeName = typeof scope.name === 'string' ? scope.name : null;

  if (scopeName != null) {
    remoteContext.releasedScopeNames[scopeName] = true;
  }

  clearResources(scope, 'timeouts', timeoutId => {
    getGlobalObject().clearTimeout?.(timeoutId);
  });
  clearResources(scope, 'intervals', intervalId => {
    getGlobalObject().clearInterval?.(intervalId);
  });
  clearResources(scope, 'animationFrames', animationFrameId => {
    getGlobalObject().cancelAnimationFrame?.(animationFrameId);
  });

  if (remoteContext.currentScope === scope) {
    remoteContext.currentScope = null;
  }

  if (scope.container != null) {
    scope.container.scope = null;
    scope.container.exposeMap = {};
  }

  scope.container = null;
  scope.hostSkeletonRoutes = [];
  scheduleRemoteScopeFinalization(scope);

  return true;
}

export function isRemoteContainerConfig(config: unknown) {
  return config == null || (typeof config === 'object' && (config as { remote?: unknown }).remote == null);
}

export function getContainerScope(name: string, config: unknown) {
  const remoteContext = getRemoteContext();

  if (remoteContext.currentScope?.released === true) {
    remoteContext.currentScope = null;
  }

  if (remoteContext.currentScope != null) {
    return remoteContext.currentScope;
  }

  if (isRemoteContainerConfig(config)) {
    return createRemoteScope(name);
  }

  return null;
}
