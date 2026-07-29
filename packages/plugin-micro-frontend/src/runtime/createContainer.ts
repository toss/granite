import type { RemoteConfig, SharedConfig, ExposeConfig } from '../types';
import type { Container } from './types';

export function createContainer(
  name: string,
  config: { remote?: RemoteConfig; shared?: SharedConfig; exposes?: ExposeConfig }
) {
  const containerName = global.__MICRO_FRONTEND__.__SERVICE_CONTAINER_NAME__ ?? name;

  if (typeof global.__MICRO_FRONTEND__.__INSTANCES__[containerName] === 'number') {
    throw new Error(`'${containerName}' container already registered`);
  }

  const containerIndex = global.__MICRO_FRONTEND__.__INSTANCES__.length;
  const container: Container = {
    name: containerName,
    config,
    exposeMap: {},
  };

  Object.defineProperty(global.__MICRO_FRONTEND__.__INSTANCES__, containerName, {
    value: containerIndex,
    enumerable: false,
    writable: false,
  });

  global.__MICRO_FRONTEND__.__INSTANCES__.push(container);

  return container;
}
