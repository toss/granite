import type { ComponentType } from 'react';
import * as ReactNative from 'react-native';
import { getGlobal } from './getGlobal';
import { isMetro } from './isMetro';
import { resolveAppContent } from './resolveAppContent';

interface LoadResult {
  default: ComponentType<any>;
}

const global = getGlobal();

function getCoreModule() {
  const module = ReactNative.TurboModuleRegistry.getEnforcing('GraniteCoreModule');

  return module as ReactNative.TurboModule & {
    /**
     * @internal
     */
    importLazy: () => Promise<void>;
  };
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
