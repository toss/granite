import path from 'path';
import type { MicroFrontendPluginOptions } from './types';

export interface MicroFrontendPreludeConfig {
  readonly banner: string;
  readonly preludeScript: string;
}

export function getPreludeConfig(
  options: MicroFrontendPluginOptions,
  appName?: string
): MicroFrontendPreludeConfig {
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
      'global._graniteMicroFrontend = global._graniteMicroFrontend || {',
      '  containers: {},',
      '  sharedModules: {},',
      '};',
    ].join('\n'),
    preludeScript: [
      'function createContainer(appName, config) {',
      '  const containers = global._graniteMicroFrontend.containers;',
      '  if (containers[appName] != null) {',
      '    throw new Error(`App container \'${appName}\' is already registered`);',
      '  }',
      '  const container = { appName, config, exposedModules: {} };',
      '  containers[appName] = container;',
      '  return container;',
      '}',
      'function exposeModule(container, exposedModule, moduleValue) {',
      "  const normalizedModule = exposedModule.startsWith('./') ? exposedModule : `./${exposedModule}`;",
      '  if (container.exposedModules[normalizedModule] != null) {',
      '    throw new Error(`Exposed module \'${normalizedModule}\' is already registered in app container \'${container.appName}\'`);',
      '  }',
      '  container.exposedModules[normalizedModule] = moduleValue;',
      '}',
      'function registerShared(moduleName, moduleValue) {',
      '  const sharedModules = global._graniteMicroFrontend.sharedModules;',
      '  const existingModule = sharedModules[moduleName];',
      '  if (existingModule != null) {',
      '    if (Object.is(existingModule.get(), moduleValue)) {',
      '      return;',
      '    }',
      '    throw new Error(`Shared module \'${moduleName}\' is already registered`);',
      '  }',
      '  sharedModules[moduleName] = { get: () => moduleValue, loaded: true };',
      '}',
      `const __container = createContainer(${containerName}, ${containerConfig});`,
      ...registerStatements,
      ...exposeStatements,
    ].join('\n'),
  };
}
