import { getLegacyContainerPair } from './containerPairing';
import { ExposedModuleAlreadyRegisteredError } from './errors';
import { getMicroFrontendGlobalContext, MicroFrontendGlobalContextCompatibilityError } from './globalContext';
import type { AppContainer } from './registry';

export function exposeContainerModule(container: AppContainer, exposedModule: string, module: unknown): void {
  const normalizedModule = normalizeExposedModule(exposedModule);
  const legacyModule = normalizeLegacyModule(exposedModule);
  const legacyContainer = getLegacyContainerPair(container);
  if (
    Reflect.has(container.exposedModules, normalizedModule) ||
    (legacyContainer != null && Reflect.has(legacyContainer.exposeMap, legacyModule))
  ) {
    throw new ExposedModuleAlreadyRegisteredError(container.appName, normalizedModule);
  }

  const ownsModernContainer = Object.is(
    Reflect.get(getMicroFrontendGlobalContext().__CONTAINERS__, container.appName),
    container
  );
  try {
    if (ownsModernContainer && !Reflect.set(container.exposedModules, normalizedModule, module)) {
      throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
    }
    if (
      legacyContainer != null &&
      !Reflect.defineProperty(legacyContainer.exposeMap, legacyModule, {
        configurable: true,
        enumerable: true,
        get: () => toLegacyEsm(module),
      })
    ) {
      throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
    }
  } catch (error) {
    if (ownsModernContainer) {
      Reflect.deleteProperty(container.exposedModules, normalizedModule);
    }
    if (legacyContainer != null) {
      Reflect.deleteProperty(legacyContainer.exposeMap, legacyModule);
    }
    throw error;
  }
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

function normalizeExposedModule(exposedModule: string): string {
  return exposedModule.startsWith('./') ? exposedModule : `./${exposedModule}`;
}

function normalizeLegacyModule(exposedModule: string): string {
  return exposedModule.startsWith('./') ? exposedModule.slice(2) : exposedModule;
}
