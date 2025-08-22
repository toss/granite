import { BrickModule } from 'brick-module';
import type { ComponentType } from 'react';
import { getGlobal } from './getGlobal';
import { isMetro } from './isMetro';
import { resolveAppContent } from './resolveAppContent';

interface LoadResult {
  default: ComponentType<any>;
}

const global = getGlobal();

function getCoreModule() {
  const module = BrickModule.get<{
    moduleName: 'TossBundleLoader';
    importLazy: () => Promise<void>;
  }>('TossBundleLoader');

  return module;
}

export function loadAppContent(remotePath: string): Promise<LoadResult> {
  if (isMetro()) {
    return Promise.reject(new Error('Dynamic bundle loading is not supported in Metro'));
  }

  const bundleLoadTask: Promise<void> = global?.__mpackInternal?.loadRemote
    ? global?.__mpackInternal?.loadRemote()
    : getCoreModule().importLazy();

  return bundleLoadTask.then(() => resolveAppContent(remotePath)).then((Component) => ({ default: Component }));
}
