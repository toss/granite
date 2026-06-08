import type { RemoteConfig, SharedConfig, ExposeConfig } from '../types';
import { createScopeRef, getContainerScope, getRemoteContext } from './remoteScope';
import type { Container } from './types';

export function createContainer(
  name: string,
  config: { remote?: RemoteConfig; shared?: SharedConfig; exposes?: ExposeConfig }
) {
  const scope = getContainerScope(name, config);
  const container: Container = {
    name,
    config,
    exposeMap: {},
  };

  if (scope != null) {
    container.scope = scope;
    scope.name = name;
    scope.container = container;
    getRemoteContext().scopes[name] = createScopeRef(scope);

    return container;
  }

  if (typeof global.__MICRO_FRONTEND__.__INSTANCES__[name] === 'number') {
    throw new Error(`'${name}' container already registered`);
  }

  const containerIndex = global.__MICRO_FRONTEND__.__INSTANCES__.length;

  Object.defineProperty(global.__MICRO_FRONTEND__.__INSTANCES__, name, {
    value: containerIndex,
    enumerable: false,
    writable: false,
  });

  global.__MICRO_FRONTEND__.__INSTANCES__.push(container);

  return container;
}
