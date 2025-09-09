import type { Container, Module } from './types';
import { normalizePath, toESM } from './utils';

export function exposeModule(container: Container, exposeName: string, module: Module) {
  const normalizedExposeName = normalizePath(exposeName);

  if (container.exposeMap[normalizedExposeName]) {
    throw new Error(`'${exposeName}' is already exposed in ${container.name} container`);
  }

  Object.defineProperty(container.exposeMap, normalizedExposeName, {
    get: () => toESM(module),
    enumerable: true,
  });
}
