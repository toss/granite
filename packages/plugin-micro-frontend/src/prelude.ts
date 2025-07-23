import path from 'path';
import type { MicroFrontendPluginOptions } from './types';

export function getPreludeConfig(options: MicroFrontendPluginOptions) {
  const sharedEntries = Object.entries(options.shared ?? {});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const eagerEntries = sharedEntries.filter(([_, config]) => config.eager === true);

  const registerStatements = eagerEntries.map(([libName], index) => {
    const identifier = `__mod${index}`;
    return `
    // ${libName}
    import * as ${identifier} from '${libName}';
    registerShared('${libName}', ${identifier});
    `;
  });

  const exposeStatements = Object.entries(options.exposes ?? {}).map(([exposeName, modulePath], index) => {
    const identifier = `__expose${index}`;
    const resolvedModulePath = path.resolve(modulePath);

    return `
    import * as ${identifier} from '${resolvedModulePath}';
    exposeModule(__container, '${exposeName}', ${identifier});
    `;
  });

  const preludeScript = [
    `import { registerShared, createContainer, exposeModule } from '@granite-js/plugin-micro-frontend/runtime';`,
    `const __container = createContainer('${options.name}', ${JSON.stringify({ remote: options.remote, shared: options.shared })});`,
    ...registerStatements,
    ...exposeStatements,
  ].join('\n');

  return {
    banner: `
    if (global.__SHARED_MODULES__ == null) {
      global.__SHARED_MODULES__ = {
        __SHARED__: {},
        __INSTANCES__: [],
      };
    }
    `,
    preludeScript,
  };
}
