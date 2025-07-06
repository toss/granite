import type { SharedModulesPluginOptions } from './types';

export function getPreludeConfig(options: SharedModulesPluginOptions) {
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

  const preludeScript = [
    `import { registerShared, createContainer } from '@granite-js/plugin-shared-modules/runtime';`,
    `createContainer('${options.name}', ${JSON.stringify({ remote: options.remote, shared: options.shared })});`,
    ...registerStatements,
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
