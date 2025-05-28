/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @format
 */

'use strict';

class AmbiguousModuleResolutionError extends Error {
  fromModulePath;
  hasteError;

  constructor(fromModulePath, hasteError) {
    super(`Ambiguous module resolution from \`${fromModulePath}\`: ` + hasteError.message);
    this.fromModulePath = fromModulePath;
    this.hasteError = hasteError;
  }
}

module.exports = AmbiguousModuleResolutionError;
