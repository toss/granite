import type { Container, Module } from './types';
import { normalizePath } from './utils';

export function exposeModule(container: Container, exposeName: string, module: Module) {
  const normalizedExposeName = normalizePath(exposeName);

  if (container.exposeMap[normalizedExposeName]) {
    throw new Error(`'${exposeName}' is already exposed in ${container.name} container`);
  }

  Object.defineProperty(container.exposeMap, normalizedExposeName, {
    get: () => Object.assign(module, { __esModule: true }),
    enumerable: true,
  });
}
