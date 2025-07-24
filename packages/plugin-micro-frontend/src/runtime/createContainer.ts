import type { RemoteConfig, SharedConfig, ExposeConfig } from '../types';
import type { Container } from './types';

export function createContainer(
  name: string,
  config: { remote?: RemoteConfig; shared?: SharedConfig; exposes?: ExposeConfig }
) {
  if (typeof global.__MICRO_FRONTEND__.__INSTANCES__[name] === 'number') {
    throw new Error(`'${name}' container already registered`);
  }

  const containerIndex = global.__MICRO_FRONTEND__.__INSTANCES__.length;
  const container: Container = {
    name,
    config,
    exposeMap: {},
  };

  Object.defineProperty(global.__MICRO_FRONTEND__.__INSTANCES__, name, {
    value: containerIndex,
    enumerable: false,
    writable: false,
  });

  global.__MICRO_FRONTEND__.__INSTANCES__.push(container);

  return container;
}
