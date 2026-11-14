import * as path from 'node:path';
import { globalContextScript } from './globalContextScript';
import { CONTAINER_PAIRING_KEY } from '../runtime/containerPairing';
import { toLegacyEsm } from '../runtime/legacyEsm';
import type { SharedConfig } from '../runtime/registry';
import { captureStackFrames, resolveCurrentSourceURL } from '../runtime/runtimeSourceURL';
import { registerLazySharedValue, registerSharedValue } from '../runtime/sharedModule';

interface MicroFrontendPreludeOptions {
  readonly shared?: SharedConfig | readonly string[];
  readonly exposes?: Readonly<Record<string, string>>;
}

export interface MicroFrontendPreludeConfig {
  readonly banner: string;
  readonly preludeScript: string;
}

export interface MicroFrontendPreludeBundlerOptions {
  /**
   * Export names of lazy shared modules, found by the bundler at build time. A module listed here is
   * registered through named imports read inside getters instead of `require(name)`. The bundler can
   * prove each read, so it tree-shakes the package like an `import * as` registration and evaluates
   * only the modules behind the exports a consumer reads. Modules not listed keep `require(name)`.
   */
  readonly lazySharedExports?: ReadonlyMap<string, readonly string[]>;
}

export function getPreludeConfig(
  options: MicroFrontendPreludeOptions,
  appName?: string,
  bundler: MicroFrontendPreludeBundlerOptions = {}
): MicroFrontendPreludeConfig {
  const eagerSharedModules = Object.entries(options.shared ?? {}).filter(
    ([, config]) => !Array.isArray(options.shared) && config.eager === true
  );
  const registerStatements = eagerSharedModules.map(([moduleName, config], index) => {
    if (config.lazy === true) {
      const exportNames = bundler.lazySharedExports?.get(moduleName);
      if (exportNames != null) {
        return createLazyFacadeRegistration(moduleName, exportNames, index);
      }
      // `require` inside the loader defers evaluation to the first get(); an `import *` would run it now.
      return `registerLazyShared(${JSON.stringify(moduleName)}, function () { return require(${JSON.stringify(moduleName)}); });`;
    }
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
  const captureFrames = captureStackFrames.toString();
  const resolveSourceURL = resolveCurrentSourceURL.toString();

  return {
    banner: [
      globalContextScript,
      '(function installMicroFrontendLifecycle(context) {',
      '  const callbacksDescriptor = Object.getOwnPropertyDescriptor(context, "disposeCallbacksByApp");',
      '  const disposeDescriptor = Object.getOwnPropertyDescriptor(context, "dispose");',
      '  const disposeCallbacksByApp = callbacksDescriptor == null ? {} : callbacksDescriptor.value;',
      '  if (typeof disposeCallbacksByApp !== "object" || disposeCallbacksByApp == null || Array.isArray(disposeCallbacksByApp)) {',
      '    throw new Error("Cannot install micro-frontend lifecycle: invalid-dispose-callback-registry");',
      '  }',
      '  const dispose = disposeDescriptor == null ? function dispose(appName, callback) {',
      '  if (typeof appName !== "string" || typeof callback !== "function") {',
      '    throw new Error("dispose() must be compiled with the microFrontend plugin");',
      '  }',
      '  const callbacks = disposeCallbacksByApp[appName] ||= new Set();',
      '  callbacks.add(callback);',
      '  let isRegistered = true;',
      '  return function unregisterDispose() {',
      '    if (!isRegistered) { return; }',
      '    isRegistered = false;',
      '    callbacks.delete(callback);',
      '  };',
      '  } : disposeDescriptor.value;',
      '  if (typeof dispose !== "function") {',
      '    throw new Error("Cannot install micro-frontend lifecycle: invalid-dispose-registrar");',
      '  }',
      '  try {',
      '    if (!Reflect.defineProperty(context, "disposeCallbacksByApp", {',
      '      configurable: true, enumerable: false, value: disposeCallbacksByApp, writable: true,',
      '    }) || !Reflect.defineProperty(context, "dispose", {',
      '      configurable: true, enumerable: false, value: dispose, writable: true,',
      '    })) {',
      '      throw new Error("Cannot install micro-frontend lifecycle: canonical-context-is-locked");',
      '    }',
      '  } catch (error) {',
      '    if (callbacksDescriptor == null) {',
      '      Reflect.deleteProperty(context, "disposeCallbacksByApp");',
      '    } else {',
      '      Reflect.defineProperty(context, "disposeCallbacksByApp", callbacksDescriptor);',
      '    }',
      '    if (disposeDescriptor == null) {',
      '      Reflect.deleteProperty(context, "dispose");',
      '    } else {',
      '      Reflect.defineProperty(context, "dispose", disposeDescriptor);',
      '    }',
      '    throw error;',
      '  }',
      '})(global.__MICRO_FRONTEND__);',
    ].join('\n'),
    preludeScript: [
      `const __containerPairSymbol = Symbol.for(${JSON.stringify(CONTAINER_PAIRING_KEY)});`,
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
      `  const stackFrames = (${captureFrames})();`,
      `  const sourceURL = (${resolveSourceURL})(stackFrames);`,
      '  const modernContainer = { appName, config, exposedModules: {}, runtime: { sourceURL } };',
      '  const legacyContainer = { name: appName, config, exposeMap: {} };',
      '  try {',
      '    if (!Reflect.defineProperty(instances, appName, {',
      '      configurable: true, enumerable: false, value: instances.length, writable: false,',
      '    })) {',
      '      throw new Error("Cannot establish the micro-frontend global context: registry-is-not-extensible");',
      '    }',
      '    instances.push(legacyContainer);',
      '    if (!Reflect.set(containers, appName, modernContainer)) {',
      '      throw new Error("Cannot establish the micro-frontend global context: registry-is-not-extensible");',
      '    }',
      '    if (!Reflect.defineProperty(modernContainer, __containerPairSymbol, {',
      '      configurable: true, enumerable: false, value: legacyContainer, writable: false,',
      '    }) || !Reflect.defineProperty(legacyContainer, __containerPairSymbol, {',
      '      configurable: true, enumerable: false, value: modernContainer, writable: false,',
      '    })) {',
      '      throw new Error("Cannot establish the micro-frontend global context: registry-is-not-extensible");',
      '    }',
      '  } catch (error) {',
      '    if (Object.is(instances[instances.length - 1], legacyContainer)) {',
      '      instances.pop();',
      '    }',
      '    Reflect.deleteProperty(instances, appName);',
      '    Reflect.deleteProperty(containers, appName);',
      '    Reflect.deleteProperty(modernContainer, __containerPairSymbol);',
      '    Reflect.deleteProperty(legacyContainer, __containerPairSymbol);',
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
      '  const legacyModuleValue = legacyContainer == null ? moduleValue : toLegacyEsm(moduleValue);',
      '  try {',
      '    if (ownsModernContainer && !Reflect.set(container.exposedModules, normalizedModule, moduleValue)) {',
      '      throw new Error("Cannot establish the micro-frontend global context: registry-is-not-extensible");',
      '    }',
      '    if (legacyContainer != null) {',
      '      Object.defineProperty(legacyContainer.exposeMap, legacyModule, {',
      '        configurable: true,',
      '        enumerable: true,',
      '        get: function () { return legacyModuleValue; },',
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
      `const toLegacyEsm = ${toLegacyEsm.toString()};`,
      `const registerSharedValue = ${registerSharedValue.toString()};`,
      `const registerLazySharedValue = ${registerLazySharedValue.toString()};`,
      'function registerShared(moduleName, moduleValue) {',
      '  const sharedModules = global.__MICRO_FRONTEND__.__SHARED__;',
      '  if (!registerSharedValue(sharedModules, moduleName, moduleValue, toLegacyEsm)) {',
      "    throw new Error(`Shared module '${moduleName}' is already registered`);",
      '  }',
      '}',
      // Shaped like a module namespace object: null prototype, sorted read-only live exports, a "Module"
      // tag, and not extensible. Like an `import * as` namespace it has no `__esModule`, so registration
      // normalizes it the same way.
      'function createLazySharedFacade(names, read) {',
      '  const facade = Object.create(null);',
      '  for (let index = 0; index < names.length; index++) {',
      '    Object.defineProperty(facade, names[index], { enumerable: true, get: function () { return read(index); } });',
      '  }',
      '  if (typeof Symbol !== "undefined" && Symbol.toStringTag) {',
      '    Object.defineProperty(facade, Symbol.toStringTag, { value: "Module" });',
      '  }',
      '  return Object.preventExtensions(facade);',
      '}',
      'function registerLazyShared(moduleName, load) {',
      '  const sharedModules = global.__MICRO_FRONTEND__.__SHARED__;',
      '  if (!registerLazySharedValue(sharedModules, moduleName, load, toLegacyEsm)) {',
      "    throw new Error(`Shared module '${moduleName}' is already registered`);",
      '  }',
      '}',
      `const __container = createContainer(${containerName}, ${containerConfig});`,
      ...registerStatements,
      ...exposeStatements,
    ].join('\n'),
  };
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

// Builds a namespace-like facade whose getters read named imports. Reading an export inside the reader is
// a read the bundler can prove, so it keeps each re-exported module lazy until that export is read.
// One reader function per module keeps the bundle small; a function per export costs more bytecode.
function createLazyFacadeRegistration(moduleName: string, exportNames: readonly string[], index: number): string {
  // The bundler passes namespace export names; keep them unique and in code unit order like a namespace.
  const names = [...new Set(exportNames)].sort();
  const facade = `__sharedFacade${index}`;
  const locals = names.map((_, exportIndex) => `__shared${index}_${exportIndex}`);
  const specifiers = names.map(
    (name, exportIndex) => `${IDENTIFIER.test(name) ? name : JSON.stringify(name)} as ${locals[exportIndex]}`
  );
  const cases = locals.map((local, exportIndex) => `case ${exportIndex}: return ${local};`);
  return [
    ...(names.length === 0 ? [] : [`import { ${specifiers.join(', ')} } from ${JSON.stringify(moduleName)};`]),
    `let ${facade};`,
    // The facade is created once, so every get() and a conflicting registration see the same object.
    `registerLazyShared(${JSON.stringify(moduleName)}, function () { return ${facade} || (${facade} = createLazySharedFacade(${JSON.stringify(names)}, function (index) { switch (index) { ${cases.join(' ')} } })); });`,
  ].join('\n');
}
