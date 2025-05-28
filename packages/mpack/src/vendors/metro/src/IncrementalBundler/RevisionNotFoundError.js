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

class RevisionNotFoundError extends Error {
  revisionId;

  constructor(revisionId) {
    super(`The revision \`${revisionId}\` was not found.`);
    this.revisionId = revisionId;
  }
}

module.exports = RevisionNotFoundError;
