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

const { getJsOutput } = require('./js');

function getSourceMapInfo(module, options) {
  return {
    ...getJsOutput(module).data,
    // MARK: - 0.81
    path: options.getSourceUrl(module) ?? module.path,
    source: options.excludeSource ? '' : getModuleSource(module),
  };
}

function getModuleSource(module) {
  if (getJsOutput(module).type === 'js/module/asset') {
    return '';
  }

  return module.getSource().toString();
}

module.exports = getSourceMapInfo;
