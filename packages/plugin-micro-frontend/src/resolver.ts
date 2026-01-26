import type { ResolverConfig } from '@granite-js/plugin-core';

const VIRTUAL_SHARED_PROTOCOL = 'virtual-shared';

export function virtualSharedConfig<Entries extends [string, object]>(moduleEntries: Entries[]) {
  const alias: ResolverConfig['alias'] = moduleEntries.map(([libName]) => ({
    from: libName,
    to: `${VIRTUAL_SHARED_PROTOCOL}:${libName}`,
    exact: true,
  }));

  const protocols: ResolverConfig['protocols'] = {
    [VIRTUAL_SHARED_PROTOCOL]: {
      load: function virtualSharedProtocolLoader(args: { path: string }) {
        return {
          loader: 'js',
          contents: `
          var sharedModule = global.__MICRO_FRONTEND__.__SHARED__['${args.path}'];

          if (sharedModule == null) {
            throw new Error("'${args.path}' is not registered in the shared registry");
          }

          module.exports = sharedModule.get();
          `,
        };
      },
    },
  };

  return { alias, protocols: alias.length > 0 ? protocols : undefined };
}
