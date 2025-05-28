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

/**
 * Indempotent function that gets us the IDs corresponding to a particular
 * module identified by path.
 */

// A *virtual* asset file ( = one generated JS module in the bundle)
// representing one or more asset variants ( = physical input files).

/**
 * Describe a set of JavaScript files and the associated assets. It could be
 * depending on modules from other libraries. To be able to resolve these
 * dependencies, these libraries need to be provided by callsites (ex. Buck).
 */

/**
 * Just like a `Library`, but it also contains module resolutions. For example
 * if there is a `require('foo')` in some JavaScript file, we keep track of the
 * path it resolves to, ex. `beep/glo/foo.js`.
 */
