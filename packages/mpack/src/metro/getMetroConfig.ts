import path from 'path';
import type { AdditionalMetroConfig } from '@granite-js/plugin-core';
import { getPackageRoot } from '@granite-js/utils';
import { createResolver } from './enhancedResolver';
import { getMonorepoRoot } from './getMonorepoRoot';
import { DEV_SERVER_DEFAULT_PORT, RESOLVER_MAIN_FIELDS, SOURCE_EXTENSIONS } from '../constants';
import { getDefaultValues } from '../vendors/metro-config/src/defaults';
import exclusionList from '../vendors/metro-config/src/defaults/exclusionList';
import { mergeConfig } from '../vendors/metro-config/src/loadConfig';

export interface GetMetroConfig {
  rootPath: string;
}

const INTERNAL_CALLSITES_REGEX = new RegExp(
  [
    '/Libraries/Renderer/implementations/.+\\.js$',
    '/Libraries/BatchedBridge/MessageQueue\\.js$',
    '/Libraries/YellowBox/.+\\.js$',
    '/Libraries/LogBox/.+\\.js$',
    '/Libraries/Core/Timers/.+\\.js$',
    '/Libraries/WebSocket/.+\\.js$',
    '/Libraries/vendor/.+\\.js$',
    '/node_modules/react-devtools-core/.+\\.js$',
    '/node_modules/react-refresh/.+\\.js$',
    '/node_modules/scheduler/.+\\.js$',
    '/node_modules/event-target-shim/.+\\.js$',
    '/node_modules/invariant/.+\\.js$',
    '/node_modules/react-native/index.js$',
    '/metro-runtime/.+\\.js$',
    '^\\[native code\\]$',
  ].join('|')
);

export async function getMetroConfig({ rootPath }: GetMetroConfig, additionalConfig?: AdditionalMetroConfig) {
  const defaultConfig = getDefaultValues(rootPath);
  const reactNativePath = path.dirname(resolveFromRoot('react-native/package.json', rootPath));
  const resolvedRootPath = await getMonorepoRoot(rootPath);
  const packageRootPath = await getPackageRoot();

  const resolveRequest =
    additionalConfig?.resolver?.resolveRequest ??
    createResolver(rootPath, {
      conditionNames: additionalConfig?.resolver?.conditionNames,
      extraNodeModules: additionalConfig?.resolver?.extraNodeModules,
    });

  return mergeConfig(defaultConfig, {
    projectRoot: additionalConfig?.projectRoot || rootPath,
    watchFolders: [resolvedRootPath, packageRootPath, ...(additionalConfig?.watchFolders || [])],
    transformerPath: resolveVendors('metro-transform-worker/src'),
    transformer: {
      allowOptionalDependencies: true,
      assetRegistryPath: path.resolve(__dirname, 'assetRegistry.js'),
      workerPath: resolveVendors('metro/src/DeltaBundler/Worker'),
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: false,
        },
      }),
      babelTransformerPath:
        additionalConfig?.transformer?.babelTransformerPath ||
        require.resolve('metro-react-native-babel-transformer'),
      asyncRequireModulePath: require.resolve('metro-runtime/src/modules/asyncRequire'),
      unstable_collectDependenciesPath: resolveVendors('metro/src/ModuleGraph/worker/collectDependencies'),
      unstable_allowRequireContext: true,
      /**
       * @see [WorkerFarm.js](../vendors/metro/src/DeltaBundler/WorkerFarm.js)
       */
      INTERNAL__transformSync: additionalConfig?.transformSync,
      /**
       * @see [index.js](../vendors/metro-transform-worker/src/index.js)
       */
      INTERNAL__babelConfig: additionalConfig?.babelConfig,
    },
    resolver: {
      // metro
      platforms: ['android', 'ios'],
      useWatchman: false,
      resolveRequest,
      // metro-file-map
      sourceExts: [...SOURCE_EXTENSIONS.map((extension) => extension.replace(/^\.?/, '')), 'cjs', 'mjs'],
      blockList: exclusionList(
        additionalConfig?.resolver?.blockList ? asArray(additionalConfig.resolver.blockList) : []
      ),
      nodeModulesPaths: additionalConfig?.resolver?.nodeModulesPaths || [],
      extraNodeModules: additionalConfig?.resolver?.extraNodeModules || {},
      disableHierarchicalLookup: additionalConfig?.resolver?.disableHierarchicalLookup,
      resolverMainFields: additionalConfig?.resolver?.resolverMainFields ?? RESOLVER_MAIN_FIELDS,
    },
    serializer: {
      getModulesRunBeforeMainModule: () => [
        resolveFromRoot('react-native/Libraries/Core/InitializeCore', rootPath),
        ...(additionalConfig?.serializer?.getModulesRunBeforeMainModule?.() ?? []),
      ],
      getPolyfills: () => [
        ...require(path.join(reactNativePath, 'rn-get-polyfills'))(),
        ...(additionalConfig?.serializer?.getPolyfills?.() ?? []),
      ],
      processModuleFilter: additionalConfig?.serializer?.processModuleFilter,
    },
    symbolicator: {
      customizeFrame: (frame: { file: string }) => {
        const collapse = Boolean(frame.file && INTERNAL_CALLSITES_REGEX.test(frame.file));
        return { collapse };
      },
    },
    server: {
      port: DEV_SERVER_DEFAULT_PORT,
    },
    reporter: additionalConfig?.reporter,
    cacheVersion: additionalConfig?.cacheVersion,
    ...(process.env.METRO_RESET_CACHE !== 'false' ? { resetCache: true } : {}),
  });
}

function resolveFromRoot(source: string, rootPath: string) {
  return require.resolve(source, { paths: [rootPath] });
}

function resolveVendors(source: string) {
  const vendorsBase = path.resolve(__dirname, '../vendors');
  return require.resolve(path.join(vendorsBase, source));
}

function asArray<T>(value: T) {
  return (Array.isArray(value) ? value : [value]) as T extends any[] ? T : T[];
}
