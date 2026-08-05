import type { ResolverConfig } from '@granite-js/plugin-core';
import type { SharedModuleConfig } from '../runtime/registry';

const VIRTUAL_SHARED_PROTOCOL = 'granite-micro-frontend-shared';

export function createSharedResolverConfig(
  moduleEntries: readonly (readonly [string, SharedModuleConfig])[]
): Pick<ResolverConfig, 'alias' | 'protocols'> {
  const alias: ResolverConfig['alias'] = moduleEntries.map(([moduleName]) => ({
    exact: true,
    from: moduleName,
    to: `${VIRTUAL_SHARED_PROTOCOL}:${moduleName}`,
  }));

  return {
    alias,
    protocols:
      alias.length === 0
        ? undefined
        : {
            [VIRTUAL_SHARED_PROTOCOL]: {
              load(args: { readonly path: string }) {
                const moduleName = JSON.stringify(args.path);
                return {
                  loader: 'js',
                  contents: [
                    `var sharedModule = global._graniteMicroFrontend.sharedModules[${moduleName}];`,
                    'if (sharedModule == null) {',
                    `  throw new Error('Shared module ' + ${moduleName} + ' is not registered');`,
                    '}',
                    'module.exports = sharedModule.get();',
                  ].join('\n'),
                };
              },
            },
          },
  };
}
