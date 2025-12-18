import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import type { AdditionalMetroConfig } from '@granite-js/plugin-core';

type MetroHelpers = {
  adaptMetroConfig: (config: AdditionalMetroConfig) => AdditionalMetroConfig;
};

export const loadRadonMetroConfig = (): AdditionalMetroConfig => {
  const nodeRequire = require;
  const requireCache = nodeRequire.cache;
  const requireResolve = nodeRequire.resolve;

  const radonIdeLibPath = process.env.RADON_IDE_LIB_PATH;
  if (!radonIdeLibPath) {
    throw new Error('RADON_IDE_LIB_PATH not set');
  }

  const metroHelpersPath = path.join(radonIdeLibPath, 'metro_helpers.js');

  const loadCjsFile = (filePath: string): MetroHelpers => {
    const resolvedFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    const cached = requireCache[resolvedFilePath];
    if (cached) {
      return cached.exports;
    }

    const code = fs.readFileSync(resolvedFilePath, 'utf8');
    // biome-ignore lint/suspicious/noExplicitAny: NodeRequire module is deprecated
    const module: any = { exports: {}, filename: resolvedFilePath };
    requireCache[resolvedFilePath] = module;

    const localRequire = ((specifier: string) => {
      if (specifier.startsWith('.')) {
        const basePath = path.resolve(path.dirname(resolvedFilePath), specifier);
        const withExtension =
          fs.existsSync(basePath)
            ? basePath
            : ['.js', '.cjs', '.json'].map((ext) => `${basePath}${ext}`).find((candidate) => fs.existsSync(candidate));

        if (!withExtension) {
          return nodeRequire(specifier);
        }

        if (withExtension.endsWith('.json')) {
          return JSON.parse(fs.readFileSync(withExtension, 'utf8'));
        }

        return loadCjsFile(withExtension);
      }

      return nodeRequire(specifier);
    }) as typeof require;

    localRequire.cache = requireCache;
    localRequire.resolve = requireResolve;

    const wrapper = `(function (exports, require, module, __filename, __dirname) { ${code}\n})`;
    const compiledWrapper = vm.runInThisContext(wrapper, { filename: resolvedFilePath });
    compiledWrapper(module.exports, localRequire, module, resolvedFilePath, path.dirname(resolvedFilePath));

    return module.exports;
  };

  const metroHelpers = loadCjsFile(metroHelpersPath);

  // Radon's `adaptMetroConfig` expects a Metro config shape that includes `projectRoot`
  // and an initial `transformer.babelTransformerPath`. It then moves that value to
  // `process.env.RADON_IDE_ORIG_BABEL_TRANSFORMER_PATH` and replaces `babelTransformerPath`
  // with its wrapper transformer.
  const appRoot = process.cwd();
  const originalBabelTransformerPath =
    process.env.RADON_IDE_ORIG_BABEL_TRANSFORMER_PATH ??
    requireResolve('metro-react-native-babel-transformer');

  const baseConfig: AdditionalMetroConfig = {
    projectRoot: appRoot,
    serializer: {
      processModuleFilter: () => true,
    },
    resolver: {
      blockList: [],
      extraNodeModules: {},
      nodeModulesPaths: [],
    },
    transformer: {
      babelTransformerPath: originalBabelTransformerPath,
    },
    watchFolders: [],
    cacheVersion: 'granite',
  };

  const adaptedConfig = metroHelpers.adaptMetroConfig(baseConfig);

  return {
    serializer: {
      processModuleFilter: adaptedConfig.serializer?.processModuleFilter,
    },
    watchFolders: adaptedConfig.watchFolders,
    resolver: {
      resolveRequest: adaptedConfig.resolver?.resolveRequest,
      blockList: adaptedConfig.resolver?.blockList,
      extraNodeModules: {
        ...adaptedConfig.resolver?.extraNodeModules,
      },
      nodeModulesPaths: adaptedConfig.resolver?.nodeModulesPaths,
    },
    transformer: {
      babelTransformerPath: adaptedConfig.transformer?.babelTransformerPath,
    },
    reporter: adaptedConfig.reporter,
    cacheVersion: adaptedConfig.cacheVersion,
  };
};
