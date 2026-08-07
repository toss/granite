import path from 'path';
import type { MicroFrontendPluginOptions } from './types';

export interface MicroFrontendPreludeConfig {
  readonly banner: string;
  readonly preludeScript: string;
}

export function getPreludeConfig(
  options: MicroFrontendPluginOptions,
  runtimeModuleSpecifier = '@granite-js/micro-frontend/runtime',
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
      `import { createContainer, exposeModule, registerShared } from ${JSON.stringify(runtimeModuleSpecifier)};`,
      `const __container = createContainer(${containerName}, ${containerConfig});`,
      ...registerStatements,
      ...exposeStatements,
    ].join('\n'),
  };
}
