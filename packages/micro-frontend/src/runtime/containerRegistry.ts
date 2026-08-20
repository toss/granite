import {
  clearContainerPair,
  defineContainerPair,
  forgetContainerPair,
  getLegacyContainerPair,
  getModernContainerPair,
  isLegacyAppContainer,
  isContainerPair,
  isObjectRecord,
  rememberContainerPair,
  rememberLegacyAdapterPair,
  type LegacyAppContainer,
} from './containerPairing';
import { AppContainerAlreadyRegisteredError } from './errors';
import { getMicroFrontendGlobalContext, MicroFrontendGlobalContextCompatibilityError } from './globalContext';
import type { AppContainer, AppContainerConfig } from './registry';

export { exposeContainerModule as exposeModule } from './containerModuleExposure';

export function createContainer(appName: string, config: AppContainerConfig = {}): AppContainer {
  const context = getMicroFrontendGlobalContext();
  const canonicalValue: unknown = Reflect.get(context.__CONTAINERS__, appName);
  const legacyIndex: unknown = Reflect.get(context.__INSTANCES__, appName);
  if (canonicalValue != null || typeof legacyIndex === 'number') {
    throw new AppContainerAlreadyRegisteredError(appName);
  }
  if (!Reflect.isExtensible(context.__CONTAINERS__) || !Reflect.isExtensible(context.__INSTANCES__)) {
    throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
  }

  const modernContainer: AppContainer = { appName, config, exposedModules: {} };
  const legacyContainer: LegacyAppContainer = { name: appName, config, exposeMap: {} };
  const containerIndex = context.__INSTANCES__.length;

  Reflect.defineProperty(context.__INSTANCES__, appName, {
    configurable: true,
    enumerable: false,
    value: containerIndex,
    writable: false,
  });
  try {
    context.__INSTANCES__.push(legacyContainer);
    if (
      !Reflect.set(context.__CONTAINERS__, appName, modernContainer) ||
      !defineContainerPair(modernContainer, legacyContainer)
    ) {
      throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
    }
  } catch (error) {
    if (Object.is(context.__INSTANCES__[context.__INSTANCES__.length - 1], legacyContainer)) {
      context.__INSTANCES__.pop();
    }
    Reflect.deleteProperty(context.__INSTANCES__, appName);
    Reflect.deleteProperty(context.__CONTAINERS__, appName);
    clearContainerPair(modernContainer, legacyContainer);
    throw error;
  }

  rememberContainerPair(modernContainer, legacyContainer);
  return modernContainer;
}

export function getContainer(appName: string): AppContainer | null {
  const context = getMicroFrontendGlobalContext();
  const canonicalValue: unknown = Reflect.get(context.__CONTAINERS__, appName);
  const modernContainer = isAppContainer(canonicalValue) ? canonicalValue : null;
  const legacyContainer = getLegacyContainer(context.__INSTANCES__, appName);

  if (modernContainer != null && legacyContainer != null) {
    if (!isContainerPair(modernContainer, legacyContainer)) {
      throw new AppContainerAlreadyRegisteredError(appName);
    }
    return modernContainer;
  }
  if (modernContainer != null) {
    return modernContainer;
  }
  if (legacyContainer != null) {
    return getLegacyAdapter(legacyContainer);
  }
  return null;
}

export function getExposedModule(container: AppContainer, exposedModule: string): unknown {
  const module: unknown = Reflect.get(container.exposedModules, normalizeExposedModule(exposedModule));
  const legacyContainer = getLegacyContainerPair(container);
  return (
    module ??
    (legacyContainer == null ? undefined : Reflect.get(legacyContainer.exposeMap, normalizeLegacyModule(exposedModule)))
  );
}

export function removeContainer(appName: string): void {
  const context = getMicroFrontendGlobalContext();
  const canonicalValue: unknown = Reflect.get(context.__CONTAINERS__, appName);
  const modernContainer = isAppContainer(canonicalValue) ? canonicalValue : null;
  const legacyContainer = getLegacyContainer(context.__INSTANCES__, appName);

  if (modernContainer != null && legacyContainer != null && !isContainerPair(modernContainer, legacyContainer)) {
    throw new AppContainerAlreadyRegisteredError(appName);
  }
  if (modernContainer == null && legacyContainer == null) {
    return;
  }

  const nextInstances = createLegacyInstancesWithout(context.__INSTANCES__, legacyContainer);
  if (legacyContainer != null && !Reflect.set(context, '__INSTANCES__', nextInstances)) {
    throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
  }

  if (modernContainer != null) {
    clearRegistry(modernContainer.exposedModules);
    Reflect.deleteProperty(context.__CONTAINERS__, appName);
  }
  if (legacyContainer != null) {
    clearLegacyModules(legacyContainer);
  }
  if (modernContainer != null) {
    if (legacyContainer != null) {
      clearContainerPair(modernContainer, legacyContainer);
    }
  }
  forgetContainerPair(modernContainer, legacyContainer);
}

function getLegacyAdapter(legacyContainer: LegacyAppContainer): AppContainer {
  const existingAdapter = getModernContainerPair(legacyContainer);
  if (existingAdapter != null) {
    return existingAdapter;
  }
  const adapter: AppContainer = {
    appName: legacyContainer.name,
    config: isAppContainerConfig(legacyContainer.config) ? legacyContainer.config : {},
    exposedModules: createNormalizedExposedModules(legacyContainer),
  };
  rememberLegacyAdapterPair(adapter, legacyContainer);
  return adapter;
}

function createNormalizedExposedModules(container: LegacyAppContainer): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get: (_target, property, receiver) =>
        Reflect.get(
          container.exposeMap,
          typeof property === 'string' ? normalizeLegacyModule(property) : property,
          receiver
        ),
      ownKeys: () =>
        Reflect.ownKeys(container.exposeMap).map((key) =>
          typeof key === 'string' ? normalizeExposedModule(key) : key
        ),
      getOwnPropertyDescriptor: (_target, property) => {
        const moduleName = typeof property === 'string' ? normalizeLegacyModule(property) : property;
        return Reflect.has(container.exposeMap, moduleName)
          ? { configurable: true, enumerable: true, value: Reflect.get(container.exposeMap, moduleName) }
          : undefined;
      },
    }
  );
}

function getLegacyContainer(instances: unknown[], appName: string): LegacyAppContainer | null {
  const index: unknown = Reflect.get(instances, appName);
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) {
    return null;
  }
  const value: unknown = instances[index];
  return isLegacyAppContainer(value) && value.name === appName ? value : null;
}

function createLegacyInstancesWithout(instances: unknown[], removed: LegacyAppContainer | null): unknown[] {
  const nextInstances =
    removed == null ? Array.from(instances) : instances.filter((entry) => !Object.is(entry, removed));
  const registeredNames = new Set<string>();
  for (const [index, entry] of nextInstances.entries()) {
    if (!isLegacyAppContainer(entry)) {
      continue;
    }
    if (registeredNames.has(entry.name) || typeof Reflect.get(nextInstances, entry.name) === 'number') {
      throw new AppContainerAlreadyRegisteredError(entry.name);
    }
    registeredNames.add(entry.name);
    Reflect.defineProperty(nextInstances, entry.name, {
      configurable: true,
      enumerable: false,
      value: index,
      writable: false,
    });
  }
  return nextInstances;
}

function clearRegistry(registry: Record<string, unknown>): void {
  for (const key of Object.keys(registry)) {
    Reflect.deleteProperty(registry, key);
  }
}

function clearLegacyModules(container: LegacyAppContainer): void {
  clearRegistry(container.exposeMap);
  if (Object.keys(container.exposeMap).length > 0 && !Reflect.set(container, 'exposeMap', {})) {
    throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
  }
}

function normalizeExposedModule(exposedModule: string): string {
  return exposedModule.startsWith('./') ? exposedModule : `./${exposedModule}`;
}

function normalizeLegacyModule(exposedModule: string): string {
  return exposedModule.startsWith('./') ? exposedModule.slice(2) : exposedModule;
}

function isAppContainer(value: unknown): value is AppContainer {
  return (
    isObjectRecord(value) &&
    typeof Reflect.get(value, 'appName') === 'string' &&
    isAppContainerConfig(Reflect.get(value, 'config')) &&
    isObjectRecord(Reflect.get(value, 'exposedModules'))
  );
}

function isAppContainerConfig(value: unknown): value is AppContainerConfig {
  if (!isObjectRecord(value)) {
    return false;
  }
  const shared: unknown = Reflect.get(value, 'shared');
  return shared == null || isObjectRecord(shared);
}
