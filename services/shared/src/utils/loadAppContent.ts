import type { ComponentType } from 'react';
import * as ReactNative from 'react-native';
import { getGlobal } from './getGlobal';
import { resolveAppContent } from './resolveAppContent';
interface LoadResult {
  default: ComponentType<unknown>;
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

export function loadAppContent(): Promise<LoadResult> {
  const bundleLoadTask: Promise<void> = global?.__mpackInternal?.loadRemote
    ? global?.__mpackInternal?.loadRemote()
    : getCoreModule().importLazy();

  return bundleLoadTask.then(resolveAppContent).then((Component) => ({ default: Component }));
}
