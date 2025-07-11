import type { RemoteConfig, SharedConfig } from '../types';

export function createContainer(name: string, config: { remote?: RemoteConfig; shared?: SharedConfig }) {
  if (global.__SHARED_MODULES__.__INSTANCES__[name]) {
    throw new Error(`'${name}' container already registered`);
  }

  global.__SHARED_MODULES__.__INSTANCES__[name] = true;
  global.__SHARED_MODULES__.__INSTANCES__.push({
    name,
    config,
  });
}
