import type { GranitePluginCore } from '@granite-js/plugin-core';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { getPackageRoot } from '@granite-js/utils';

function detectRadonIdeExtensionPath(): string | undefined {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    return undefined;
  }

  // Check VSCode extensions
  const vscodeExtPath = path.join(homeDir, '.vscode', 'extensions');
  // Check Cursor extensions (multiple possible locations)
  const cursorExtPaths = [
    path.join(homeDir, '.cursor', 'extensions'),
    path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'extensions'),
  ];

  const searchPaths = [vscodeExtPath, ...cursorExtPaths];

  for (const searchPath of searchPaths) {
    if (fs.existsSync(searchPath)) {
      const entries = fs.readdirSync(searchPath);
      // Match exact version: swmansion.react-native-ide-1.14.2-{platform}
      const radonFolder = entries.find((entry) => /^swmansion\.react-native-ide-1\.14\.2-.+$/.test(entry));
      if (radonFolder) {
        const fullPath = path.join(searchPath, radonFolder);
        console.log(`[Radon] Found extension at: ${fullPath}`);
        return fullPath;
      }
    }
  }

  console.warn('[Radon] Extension not found');
  return undefined;
}

function loadRadonMetroConfig(): any {
  const nodeRequire = require;
  const requireCache = nodeRequire.cache;
  const requireResolve = nodeRequire.resolve;

  const radonIdeLibPath = process.env.RADON_IDE_LIB_PATH;
  if (!radonIdeLibPath) {
    throw new Error('RADON_IDE_LIB_PATH not set');
  }

  const metroHelpersPath = path.join(radonIdeLibPath, 'metro_helpers.js');

  const loadCjsFile = (filePath: string): any => {
    const resolvedFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
    const cached = requireCache[resolvedFilePath];
    if (cached) {
      return cached.exports;
    }

    const code = fs.readFileSync(resolvedFilePath, 'utf8');
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

function ensureRadonIdeEnv() {
  const appRoot = getPackageRoot();
  const radonIdePath = detectRadonIdeExtensionPath();

  if (!radonIdePath) {
    console.warn('[Radon] Extension not found, Radon IDE features will not be available');
    return;
  }

  const radonIdeLibPath = path.join(radonIdePath, 'lib');
  const metroConfigPath = path.join(radonIdeLibPath, 'metro_config.js');

  process.env.RN_IDE_METRO_CONFIG_PATH = metroConfigPath;
  process.env.NODE_PATH = path.join(appRoot, 'node_modules');
  process.env.RCT_METRO_PORT = '8081';
  process.env.RADON_IDE_LIB_PATH = radonIdeLibPath;
  process.env.RADON_IDE_VERSION = '1.14.2';

  console.log('[Radon] Environment configured');
}

// Ensure RADON_IDE_LIB_PATH is set as early as possible
ensureRadonIdeEnv();

export const radonCustomMetroPlugin = (): GranitePluginCore => {
  let radonMetroConfig = {};

  try {
    radonMetroConfig = loadRadonMetroConfig();
    console.log('[Radon] Radon IDE customizations:', JSON.stringify(radonMetroConfig, null, 2));
    console.log('[Radon] Plugin initialized with Radon IDE customizations');
  } catch (error) {
    console.error('[Radon] Failed to load metro customizations:', error);
  }

  return {
    name: 'radon-custom-metro-plugin',
    config: {
      metro: radonMetroConfig,
    },
  };
};
