import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import type { AdditionalMetroConfig } from '@granite-js/plugin-core';

type MetroHelpers = {
  adaptMetroConfig: (config: AdditionalMetroConfig) => AdditionalMetroConfig;
}

export const loadRadonMetroConfig = () => {
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
  
    // Load metro_helpers.js
    const metroHelpers = loadCjsFile(metroHelpersPath);
  
    // Create a minimal base config to pass to adaptMetroConfig
    const baseConfig = {
      serializer: {},
      resolver: {},
      transformer: {},
      watchFolders: [],
    };
  
    const adaptedConfig = metroHelpers.adaptMetroConfig(baseConfig);
  
    // Extract only the 9 specific customizations
    return {
      serializer: {
        processModuleFilter: adaptedConfig.serializer?.processModuleFilter,
      },
      watchFolders: adaptedConfig.watchFolders,
      resolver: {
        resolveRequest: adaptedConfig.resolver?.resolveRequest,
        blockList: adaptedConfig.resolver?.blockList,
        extraNodeModules: adaptedConfig.resolver?.extraNodeModules,
        nodeModulesPaths: adaptedConfig.resolver?.nodeModulesPaths,
      },
      transformer: {
        babelTransformerPath: adaptedConfig.transformer?.babelTransformerPath,
      },
      reporter: adaptedConfig.reporter,
      cacheVersion: adaptedConfig.cacheVersion,
    };
  }
