import * as path from 'path';

const VIRTUAL_INITIALIZE_CORE_PROTOCOL = 'virtual-initialize-core';
const VIRTUAL_SHARED_PROTOCOL = 'virtual-shared';

export function virtualInitializeCoreConfig() {
  const reactNativePath = path.dirname(
    require.resolve('react-native/package.json', {
      paths: [process.cwd()],
    })
  );
  const initializeCorePath = path.join(reactNativePath, 'Libraries/Core/InitializeCore.js');

  const alias = [
    {
      // `InitializeCore.js` file is loaded by prelude script in mpack. so we need to prefix `prelude:` to resolve it.
      from: `prelude:${initializeCorePath}`,
      to: `${VIRTUAL_INITIALIZE_CORE_PROTOCOL}:noop`,
      exact: false,
    },
  ];

  const protocols = {
    [VIRTUAL_INITIALIZE_CORE_PROTOCOL]: {
      load: function virtualInitializeCoreProtocolLoader() {
        return {
          loader: 'js',
          contents: `// noop`,
        };
      },
    },
  };

  return { alias, protocols };
}

export function virtualSharedConfig<Entries extends [string, object]>(moduleEntries: Entries[]) {
  const alias = moduleEntries.map(([libName]) => ({
    from: libName,
    to: `${VIRTUAL_SHARED_PROTOCOL}:${libName}`,
    exact: true,
  }));

  const protocols = {
    ...(alias.length > 0
      ? {
          [VIRTUAL_SHARED_PROTOCOL]: {
            load: function virtualSharedProtocolLoader(args: { path: string }) {
              return {
                loader: 'js',
                contents: `module.exports = global.__SHARED_MODULES__.__SHARED__['${args.path}'].get();`,
              };
            },
          },
        }
      : null),
  };

  return { alias, protocols };
}
