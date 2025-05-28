/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

import { ModuleMap } from 'metro-file-map';

const { ModuleResolver } = require('../../node-haste/DependencyGraph/ModuleResolution');
const parsePlatformFilePath = require('../../node-haste/lib/parsePlatformFilePath');
const HasteFS = require('./HasteFS');
const Module = require('./Module');
const ModuleCache = require('./ModuleCache');
// MARK: - GRANITE
const defaults = require('../../../../metro-config/src/defaults/defaults');
const path = require('path');

const NATIVE_PLATFORM = 'native';
const GENERIC_PLATFORM = 'g';
const PACKAGE_JSON = path.sep + 'package.json';
const NULL_MODULE = {
  path: '/',
  getPackage() {},
  isHaste() {
    throw new Error('not implemented');
  },
  getName() {
    throw new Error('not implemented');
  },
};

const NODE_MODULES = path.sep + 'node_modules' + path.sep;
const isNodeModules = (file) => file.includes(NODE_MODULES);

// This function maps the ModuleGraph data structure to metro-file-map's ModuleMap
const createModuleMap = ({ files, moduleCache, sourceExts, additionalExts, platforms }) => {
  const platformSet = new Set((platforms ?? defaults.platforms).concat([NATIVE_PLATFORM]));

  const map = new Map();

  files.forEach((filePath) => {
    if (isNodeModules(filePath)) {
      return;
    }
    let id;
    let module;
    const fileExt = path.extname(filePath).substr(1);

    if (filePath.endsWith(PACKAGE_JSON)) {
      module = moduleCache.getPackage(filePath);
      id = module.data.name;
    } else if (sourceExts.has(fileExt) || additionalExts.has(fileExt)) {
      module = moduleCache.getModule(filePath);
      id = module.name;
    }

    if (!(id && module && module.isHaste())) {
      return;
    }

    const mapModule = map.get(id) || Object.create(null);

    const platform = parsePlatformFilePath(filePath, platformSet).platform || GENERIC_PLATFORM;

    const existingModule = mapModule[platform];
    // 0 = Module, 1 = Package in metro-file-map
    mapModule[platform] = [filePath, module.type === 'Package' ? 1 : 0];

    if (existingModule && existingModule[0] !== filePath) {
      throw new Error(
        [
          '@providesModule naming collision:',
          `  Duplicate module name: \`${id}\``,
          `  Paths: \`${filePath}\` collides with \`${existingModule[0]}\``,
          '',
          'This error is caused by a @providesModule declaration ' + 'with the same name across two different files.',
        ].join('\n')
      );
    }

    map.set(id, mapModule);
  });
  return map;
};

exports.createResolveFn = function (options) {
  const {
    assetExts,
    assetResolutions,
    extraNodeModules,
    transformedFiles,
    sourceExts,
    additionalExts,
    platform,
    platforms,
  } = options;
  const files = Object.keys(transformedFiles);
  function getTransformedFile(path) {
    const result = transformedFiles[path];
    if (!result) {
      throw new Error(`"${path} does not exist`);
    }
    return result;
  }

  const hasteFS = new HasteFS(files);
  const moduleCache = new ModuleCache((filePath) => hasteFS.closest(filePath, 'package.json'), getTransformedFile);

  const assetExtensions = new Set(assetExts.map((asset) => '.' + asset));
  const isAssetFile = (file) => assetExtensions.has(path.extname(file));

  const moduleResolver = new ModuleResolver({
    dirExists: (filePath) => hasteFS.dirExists(filePath),
    disableHierarchicalLookup: options.disableHierarchicalLookup,
    doesFileExist: (filePath) => hasteFS.exists(filePath),
    emptyModulePath: options.emptyModulePath,
    extraNodeModules,
    isAssetFile,
    mainFields: options.mainFields,
    moduleCache,
    moduleMap: new ModuleMap({
      duplicates: new Map(),
      map: createModuleMap({
        files,
        moduleCache,
        sourceExts: new Set(sourceExts),
        additionalExts: new Set(additionalExts),
        platforms,
      }),
      mocks: new Map(),
      rootDir: '',
    }),
    nodeModulesPaths: options.nodeModulesPaths,
    preferNativePlatform: true,
    projectRoot: '',
    resolveAsset: (dirPath, assetName, extension) => {
      const basePath = dirPath + path.sep + assetName;
      const assets = [
        basePath + extension,
        ...assetResolutions.map((resolution) => basePath + '@' + resolution + 'x' + extension),
      ].filter((candidate) => hasteFS.exists(candidate));
      return assets.length ? assets : null;
    },
    resolveRequest: options.resolveRequest,
    sourceExts,
  });

  return (id, sourcePath) => {
    const from = sourcePath != null ? new Module(sourcePath, moduleCache, getTransformedFile(sourcePath)) : NULL_MODULE;
    return moduleResolver.resolveDependency(from, id, true, platform, options.resolverOptions).path;
  };
};
