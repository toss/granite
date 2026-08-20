import { AppContainerAlreadyRegisteredError, ExposedModuleAlreadyRegisteredError } from './errors';
import { getMicroFrontendGlobalContext, MicroFrontendGlobalContextCompatibilityError } from './globalContext';
import type { AppContainer, AppContainerConfig } from './registry';

interface LegacyAppContainer {
  readonly name: string;
  readonly config: unknown;
  readonly exposeMap: Record<string, unknown>;
}

const pairedLegacyByModern = new WeakMap<AppContainer, LegacyAppContainer>();
const pairedModernByLegacy = new WeakMap<LegacyAppContainer, AppContainer>();

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
  context.__INSTANCES__.push(legacyContainer);
  if (!Reflect.set(context.__CONTAINERS__, appName, modernContainer)) {
    context.__INSTANCES__.pop();
    Reflect.deleteProperty(context.__INSTANCES__, appName);
    throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
  }

  pairedLegacyByModern.set(modernContainer, legacyContainer);
  pairedModernByLegacy.set(legacyContainer, modernContainer);
  return modernContainer;
}

export function exposeModule(container: AppContainer, exposedModule: string, module: unknown): void {
  const normalizedModule = normalizeExposedModule(exposedModule);
  const legacyContainer = pairedLegacyByModern.get(container);
  const legacyModuleName = normalizeLegacyModule(exposedModule);
  if (
    Reflect.has(container.exposedModules, normalizedModule) ||
    (legacyContainer != null && Reflect.has(legacyContainer.exposeMap, legacyModuleName))
  ) {
    throw new ExposedModuleAlreadyRegisteredError(container.appName, normalizedModule);
  }

  if (Object.is(Reflect.get(getMicroFrontendGlobalContext().__CONTAINERS__, container.appName), container)) {
    Reflect.set(container.exposedModules, normalizedModule, module);
  }
  if (legacyContainer != null) {
    defineLegacyModule(legacyContainer.exposeMap, legacyModuleName, module);
  }
}

export function getContainer(appName: string): AppContainer | null {
  const context = getMicroFrontendGlobalContext();
  const canonicalValue: unknown = Reflect.get(context.__CONTAINERS__, appName);
  const modernContainer = isAppContainer(canonicalValue) ? canonicalValue : null;
  const legacyContainer = getLegacyContainer(context.__INSTANCES__, appName);

  if (modernContainer != null && legacyContainer != null) {
    if (!Object.is(pairedLegacyByModern.get(modernContainer), legacyContainer)) {
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
  const legacyContainer = pairedLegacyByModern.get(container);
  return (
    module ??
    (legacyContainer == null ? undefined : Reflect.get(legacyContainer.exposeMap, normalizeLegacyModule(exposedModule)))
  );
}

export function hasContainer(appName: string): boolean {
  return getContainer(appName) != null;
}

export function removeContainer(appName: string): void {
  const context = getMicroFrontendGlobalContext();
  const canonicalValue: unknown = Reflect.get(context.__CONTAINERS__, appName);
  const modernContainer = isAppContainer(canonicalValue) ? canonicalValue : null;
  const legacyContainer = getLegacyContainer(context.__INSTANCES__, appName);

  if (
    modernContainer != null &&
    legacyContainer != null &&
    !Object.is(pairedLegacyByModern.get(modernContainer), legacyContainer)
  ) {
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
    pairedModernByLegacy.delete(legacyContainer);
  }
  if (modernContainer != null) {
    pairedLegacyByModern.delete(modernContainer);
  }
}

function getLegacyAdapter(legacyContainer: LegacyAppContainer): AppContainer {
  const existingAdapter = pairedModernByLegacy.get(legacyContainer);
  if (existingAdapter != null) {
    return existingAdapter;
  }
  const adapter: AppContainer = {
    appName: legacyContainer.name,
    config: isAppContainerConfig(legacyContainer.config) ? legacyContainer.config : {},
    exposedModules: createNormalizedExposedModules(legacyContainer),
  };
  pairedLegacyByModern.set(adapter, legacyContainer);
  pairedModernByLegacy.set(legacyContainer, adapter);
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
      has: (_target, property) =>
        Reflect.has(container.exposeMap, typeof property === 'string' ? normalizeLegacyModule(property) : property),
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

function defineLegacyModule(exposeMap: Record<string, unknown>, moduleName: string, module: unknown): void {
  Reflect.defineProperty(exposeMap, moduleName, {
    configurable: true,
    enumerable: true,
    get: () => toLegacyEsm(module),
  });
}

function toLegacyEsm(module: unknown): unknown {
  if ((typeof module !== 'object' || module == null) && typeof module !== 'function') {
    return module;
  }
  if (Reflect.get(module, '__esModule') === true) {
    return module;
  }
  const descriptors: PropertyDescriptorMap = { __esModule: { value: true } };
  if (Reflect.get(module, 'default') == null) {
    descriptors.default = { enumerable: true, value: module };
  }
  return Object.defineProperties(module, descriptors);
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

function isLegacyAppContainer(value: unknown): value is LegacyAppContainer {
  return (
    isObjectRecord(value) &&
    typeof Reflect.get(value, 'name') === 'string' &&
    isObjectRecord(Reflect.get(value, 'config')) &&
    isObjectRecord(Reflect.get(value, 'exposeMap'))
  );
}

function isAppContainerConfig(value: unknown): value is AppContainerConfig {
  if (!isObjectRecord(value)) {
    return false;
  }
  const shared: unknown = Reflect.get(value, 'shared');
  return shared == null || isObjectRecord(shared);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
