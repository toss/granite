import { assertRuntimeContextUsable, getRuntimeContext } from './context';
import type { Container, ContainerConfig, RuntimeContext } from './types';

export function createContainer(name: string, config: ContainerConfig, context?: RuntimeContext) {
  const runtimeContext = getRuntimeContext(context);
  assertRuntimeContextUsable(runtimeContext);

  if (typeof runtimeContext.__INSTANCES__[name] === 'number') {
    throw new Error(`'${name}' container already registered`);
  }

  const containerIndex = runtimeContext.__INSTANCES__.length;
  const container: Container = {
    name,
    config,
    exposeMap: {},
  };

  Object.defineProperty(runtimeContext.__INSTANCES__, name, {
    value: containerIndex,
    enumerable: false,
    writable: false,
  });

  runtimeContext.__INSTANCES__.push(container);

  return container;
}
