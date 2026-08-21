import type { PluginObj } from '@babel/core';
import type * as BabelTypes from '@babel/types';

export interface DisposeOwnershipPluginOptions {
  appName?: string;
}

export function injectDisposeAppName(
  { types: babelTypes }: { types: typeof BabelTypes },
  options: DisposeOwnershipPluginOptions
): PluginObj {
  return {
    name: 'inject-micro-frontend-dispose-app-name',
    visitor: {
      CallExpression(path) {
        if (options.appName == null || path.node.arguments.length !== 1) {
          return;
        }

        const runtimeIdentifier = getRuntimeIdentifier(path.node.callee, babelTypes);
        if (runtimeIdentifier == null || path.scope.getBinding(runtimeIdentifier) != null) {
          return;
        }

        path.node.arguments.unshift(babelTypes.stringLiteral(options.appName));
      },
    },
  };
}

function getRuntimeIdentifier(
  callee: BabelTypes.Expression | BabelTypes.V8IntrinsicIdentifier,
  babelTypes: typeof BabelTypes
): string | null {
  // - `global.__MICRO_FRONTEND__.dispose()`
  // - `globalThis.__MICRO_FRONTEND__.dispose()`
  if (
    !babelTypes.isMemberExpression(callee) ||
    callee.computed ||
    !babelTypes.isIdentifier(callee.property, { name: 'dispose' }) ||
    !babelTypes.isMemberExpression(callee.object) ||
    callee.object.computed ||
    !babelTypes.isIdentifier(callee.object.property, { name: '__MICRO_FRONTEND__' }) ||
    (!babelTypes.isIdentifier(callee.object.object, { name: 'global' }) &&
      !babelTypes.isIdentifier(callee.object.object, { name: 'globalThis' }))
  ) {
    return null;
  }

  return callee.object.object.name;
}
