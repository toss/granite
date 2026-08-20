import path from 'path';
import { globalContextScript } from './globalContextScript';
import type { MicroFrontendPluginOptions } from './types';

export interface MicroFrontendPreludeConfig {
  readonly banner: string;
  readonly preludeScript: string;
}

export function getPreludeConfig(options: MicroFrontendPluginOptions, appName?: string): MicroFrontendPreludeConfig {
  const eagerSharedModules = Object.entries(options.shared ?? {}).filter(
    ([, config]) => !Array.isArray(options.shared) && config.eager === true
  );
  const registerStatements = eagerSharedModules.map(([moduleName], index) => {
    const identifier = `__shared${index}`;
    return [
      `import * as ${identifier} from ${JSON.stringify(moduleName)};`,
      `registerShared(${JSON.stringify(moduleName)}, ${identifier});`,
    ].join('\n');
  });
  const exposeStatements = Object.entries(options.exposes ?? {}).map(([exposedModule, modulePath], index) => {
    const identifier = `__expose${index}`;
    return [
      `import * as ${identifier} from ${JSON.stringify(path.resolve(modulePath))};`,
      `exposeModule(__container, ${JSON.stringify(exposedModule)}, ${identifier});`,
    ].join('\n');
  });
  const containerConfig = JSON.stringify({ shared: options.shared });
  const containerName = appName == null ? 'global.__granite.app.name' : JSON.stringify(appName);

  return {
    banner: [
      globalContextScript,
      'global._graniteMicroFrontend.disposeCallbacksByApp = global._graniteMicroFrontend.disposeCallbacksByApp || {};',
      'global._graniteMicroFrontend.dispose = global._graniteMicroFrontend.dispose || function dispose(appName, callback) {',
      '  if (typeof appName !== "string" || typeof callback !== "function") {',
      '    throw new Error("dispose() must be compiled with the microFrontend plugin");',
      '  }',
      '  const callbacks = global._graniteMicroFrontend.disposeCallbacksByApp[appName] ||= new Set();',
      '  callbacks.add(callback);',
      '  let isRegistered = true;',
      '  return function unregisterDispose() {',
      '    if (!isRegistered) { return; }',
      '    isRegistered = false;',
      '    callbacks.delete(callback);',
      '  };',
      '};',
    ].join('\n'),
    preludeScript: [
      'const __legacyContainers = new WeakMap();',
      'function createContainer(appName, config) {',
      '  const context = global.__MICRO_FRONTEND__;',
      '  const containers = context.__CONTAINERS__;',
      '  const instances = context.__INSTANCES__;',
      '  if (containers[appName] != null || typeof instances[appName] === "number") {',
      "    throw new Error(`App container '${appName}' is already registered`);",
      '  }',
      '  if (!Object.isExtensible(containers) || !Object.isExtensible(instances)) {',
      '    throw new Error("Cannot establish the micro-frontend global context: registry-is-not-extensible");',
      '  }',
      '  const modernContainer = { appName, config, exposedModules: {} };',
      '  const legacyContainer = { name: appName, config, exposeMap: {} };',
      '  Object.defineProperty(instances, appName, {',
      '    configurable: true, enumerable: false, value: instances.length, writable: false,',
      '  });',
      '  try {',
      '    instances.push(legacyContainer);',
      '    if (!Reflect.set(containers, appName, modernContainer)) {',
      '      throw new Error("Cannot establish the micro-frontend global context: registry-is-not-extensible");',
      '    }',
      '  } catch (error) {',
      '    if (Object.is(instances[instances.length - 1], legacyContainer)) {',
      '      instances.pop();',
      '    }',
      '    Reflect.deleteProperty(instances, appName);',
      '    Reflect.deleteProperty(containers, appName);',
      '    throw error;',
      '  }',
      '  __legacyContainers.set(modernContainer, legacyContainer);',
      '  return modernContainer;',
      '}',
      'function exposeModule(container, exposedModule, moduleValue) {',
      "  const normalizedModule = exposedModule.startsWith('./') ? exposedModule : `./${exposedModule}`;",
      "  const legacyModule = exposedModule.startsWith('./') ? exposedModule.slice(2) : exposedModule;",
      '  const legacyContainer = __legacyContainers.get(container);',
      '  if (Reflect.has(container.exposedModules, normalizedModule) ||',
      '      (legacyContainer != null && Reflect.has(legacyContainer.exposeMap, legacyModule))) {',
      "    throw new Error(`Exposed module '${normalizedModule}' is already registered in app container '${container.appName}'`);",
      '  }',
      '  const ownsModernContainer = Object.is(',
      '    global.__MICRO_FRONTEND__.__CONTAINERS__[container.appName],',
      '    container',
      '  );',
      '  try {',
      '    if (ownsModernContainer && !Reflect.set(container.exposedModules, normalizedModule, moduleValue)) {',
      '      throw new Error("Cannot establish the micro-frontend global context: registry-is-not-extensible");',
      '    }',
      '    if (legacyContainer != null) {',
      '      Object.defineProperty(legacyContainer.exposeMap, legacyModule, {',
      '        configurable: true,',
      '        enumerable: true,',
      '        get: function () {',
      '          if ((typeof moduleValue !== "object" || moduleValue == null) && typeof moduleValue !== "function") {',
      '            return moduleValue;',
      '          }',
      '          if (moduleValue.__esModule !== true) {',
      '            const descriptors = { __esModule: { value: true } };',
      '            if (moduleValue.default == null) {',
      '              descriptors.default = { enumerable: true, value: moduleValue };',
      '            }',
      '            Object.defineProperties(moduleValue, descriptors);',
      '          }',
      '          return moduleValue;',
      '        },',
      '      });',
      '    }',
      '  } catch (error) {',
      '    if (ownsModernContainer) {',
      '      Reflect.deleteProperty(container.exposedModules, normalizedModule);',
      '    }',
      '    if (legacyContainer != null) {',
      '      Reflect.deleteProperty(legacyContainer.exposeMap, legacyModule);',
      '    }',
      '    throw error;',
      '  }',
      '}',
      'function registerShared(moduleName, moduleValue) {',
      '  const sharedModules = global.__MICRO_FRONTEND__.__SHARED__;',
      '  const existingModule = sharedModules[moduleName];',
      '  if (existingModule != null) {',
      '    if (typeof existingModule === "object" &&',
      '        typeof existingModule.get === "function" &&',
      '        typeof existingModule.loaded === "boolean" &&',
      '        Object.is(existingModule.get(), moduleValue)) {',
      '      return;',
      '    }',
      "    throw new Error(`Shared module '${moduleName}' is already registered`);",
      '  }',
      '  sharedModules[moduleName] = { get: () => moduleValue, loaded: true };',
      '}',
      `const __container = createContainer(${containerName}, ${containerConfig});`,
      ...registerStatements,
      ...exposeStatements,
    ].join('\n'),
  };
}
