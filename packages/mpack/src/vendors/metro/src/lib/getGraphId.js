/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *       strict-local
 * @format
 */

'use strict';

// MARK: - GRANITE
const canonicalize = require('../../../metro-core/src/canonicalize');

function getGraphId(
  entryFile,
  options,
  { shallow, experimentalImportBundleSupport, unstable_allowRequireContext, resolverOptions }
) {
  return JSON.stringify(
    {
      entryFile,
      options: {
        customResolverOptions: resolverOptions.customResolverOptions ?? {},
        customTransformOptions: options.customTransformOptions ?? null,
        dev: options.dev,
        experimentalImportSupport: options.experimentalImportSupport || false,
        hot: options.hot,
        minify: options.minify,
        unstable_disableES6Transforms: options.unstable_disableES6Transforms,
        platform: options.platform != null ? options.platform : null,
        runtimeBytecodeVersion: options.runtimeBytecodeVersion,
        type: options.type,
        experimentalImportBundleSupport,
        unstable_allowRequireContext,
        shallow,
        unstable_transformProfile: options.unstable_transformProfile || 'default',
      },
    },
    canonicalize
  );
}

module.exports = getGraphId;
