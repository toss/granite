import { assertRuntimeContextUsable, getRuntimeContext } from './context';
import type { Module, RuntimeContext } from './types';

export function getContainer(instanceName: string, context?: RuntimeContext) {
  const runtimeContext = getRuntimeContext(context);
  assertRuntimeContextUsable(runtimeContext);
  const containerIndex = runtimeContext.__INSTANCES__[instanceName];

  return typeof containerIndex === 'number' ? runtimeContext.__INSTANCES__[containerIndex]! : null;
}

export function getRegisteredRemoteEntry(appName: string) {
  return global.__GRANITE_MICRO_FRONTEND_ENTRIES__?.[appName] ?? null;
}

export function getScopedRuntimeContext(appName: string) {
  return global.__GRANITE_MICRO_FRONTEND_SCOPES__?.[appName] ?? null;
}

/**
 * Unpublishes a scoped runtime context from the global registry. When
 * `expectedContext` is given, the slot is only removed while it still holds
 * that exact context — a stale dispose from generation N cannot unpublish
 * the scope that generation N+1 re-created.
 */
export function deleteScopedRuntimeContext(appName: string, expectedContext?: RuntimeContext): boolean {
  const scopes = global.__GRANITE_MICRO_FRONTEND_SCOPES__;
  const current = scopes?.[appName];

  if (scopes == null || current == null) {
    return false;
  }

  if (expectedContext != null && current !== expectedContext) {
    return false;
  }

  delete scopes[appName];
  return true;
}

export function normalizePath(path: string) {
  if (path.startsWith('./')) {
    return path.slice(2);
  }

  return path;
}

export function parseRemotePath(remotePath: string) {
  const [remoteName, ...rest] = remotePath.split('/');

  if (remoteName && rest.length > 0) {
    return {
      remoteName,
      modulePath: rest.join('/'),
      fullRequest: remotePath,
    };
  }

  throw new Error(`Invalid remote request: ${remotePath}`);
}

export function importRemoteModule(remoteRequestPath: string, context?: RuntimeContext) {
  const { remoteName, modulePath } = parseRemotePath(remoteRequestPath);
  const container = getContainer(remoteName, context);

  if (container == null) {
    throw new Error(`${remoteName} container not found`);
  }

  const module = container.exposeMap[normalizePath(modulePath)];
  if (module == null) {
    throw new Error(`Could not resolve '${modulePath}' in ${remoteName} container`);
  }

  return module;
}

export function toESM(module: Module) {
  if (module.__esModule) {
    return module;
  }

  // Add `__esModule` flag to ensure compatibility between ESM and CJS.
  return Object.defineProperties(module, {
    __esModule: { value: true },
    ...(module.default == null
      ? {
          default: {
            value: module,
            enumerable: true,
          },
        }
      : null),
  });
}
