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
  const legacyModuleValue = legacyContainer == null ? module : toLegacyEsm(module);
  try {
    if (ownsModernContainer && !Reflect.set(container.exposedModules, normalizedModule, module)) {
      throw new MicroFrontendGlobalContextCompatibilityError('registry-is-not-extensible');
    }
    if (
      legacyContainer != null &&
      !Reflect.defineProperty(legacyContainer.exposeMap, legacyModule, {
        configurable: true,
        enumerable: true,
        get: () => legacyModuleValue,
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
  const legacyModule =
    typeof module === 'function'
      ? function (this: unknown, ...args: unknown[]): unknown {
          return Reflect.apply(module, this, args);
        }
      : {};
  for (const exportName of Reflect.ownKeys(module)) {
    if (exportName === '__esModule' || exportName === 'default') {
      continue;
    }
    const sourceDescriptor = Reflect.getOwnPropertyDescriptor(module, exportName);
    const facadeDescriptor = Reflect.getOwnPropertyDescriptor(legacyModule, exportName);
    if (sourceDescriptor == null || facadeDescriptor?.configurable === false) {
      // Callable facades keep intrinsic non-configurable slots such as prototype.
      continue;
    }
    Reflect.defineProperty(legacyModule, exportName, {
      enumerable: sourceDescriptor.enumerable,
      get: () => Reflect.get(module, exportName),
    });
  }
  const hasDefaultExport = Reflect.getOwnPropertyDescriptor(module, 'default') != null;
  Object.defineProperties(legacyModule, {
    __esModule: { value: true },
    default: {
      enumerable: true,
      get: hasDefaultExport ? () => Reflect.get(module, 'default') : () => module,
    },
  });
  return legacyModule;
}

function normalizeExposedModule(exposedModule: string): string {
  return exposedModule.startsWith('./') ? exposedModule : `./${exposedModule}`;
}

function normalizeLegacyModule(exposedModule: string): string {
  return exposedModule.startsWith('./') ? exposedModule.slice(2) : exposedModule;
}
