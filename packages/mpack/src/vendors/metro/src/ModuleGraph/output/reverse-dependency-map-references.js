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

import invariant from 'invariant';
import nullthrows from 'nullthrows';

function reverseDependencyMapReferences({ types: t }) {
  return {
    visitor: {
      CallExpression(path, state) {
        const { node } = path;

        if (node.callee.name === `${state.opts.globalPrefix}__d`) {
          // $FlowFixMe Flow error uncovered by typing Babel more strictly
          const lastArg = node.arguments[0].params.slice(-1)[0];
          const depMapName = lastArg && lastArg.name;

          if (depMapName == null) {
            return;
          }

          const body = path.get('arguments.0.body');
          invariant(!Array.isArray(body), 'meetro: Expected `body` to be a single path.');

          const scope = body.scope;
          const binding = nullthrows(scope.getBinding(depMapName));

          binding.referencePaths.forEach(({ parentPath }) => {
            const memberNode = parentPath?.node;

            if (
              memberNode != null &&
              memberNode.type === 'MemberExpression' &&
              memberNode.property.type === 'NumericLiteral'
            ) {
              const numericLiteral = t.numericLiteral(state.opts.dependencyIds[memberNode.property.value]);
              nullthrows(parentPath).replaceWith(numericLiteral);
            }
          });
        }
      },
    },
  };
}

module.exports = reverseDependencyMapReferences;
