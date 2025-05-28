import { PluginObj, types } from '@babel/core';

const GLOBAL_NAMESPACE = '__granite';

export default function replaceImportMetaEnv({ types: t }: { types: typeof types }): PluginObj {
  function isImportMetaEnv(node: types.Node): node is types.MemberExpression {
    if (!t.isMemberExpression(node)) {
      return false;
    }
    if (!t.isMetaProperty(node.object)) {
      return false;
    }
    if (!t.isIdentifier(node.property)) {
      return false;
    }
    return node.object.meta.name === 'import' && node.object.property.name === 'meta' && node.property.name === 'env';
  }

  return {
    name: 'replace-import-meta-env',
    visitor: {
      MemberExpression(path) {
        const node = path.node;

        if (isImportMetaEnv(node)) {
          let replacement: types.MemberExpression | types.OptionalMemberExpression = t.memberExpression(
            t.memberExpression(
              t.memberExpression(t.identifier('global'), t.identifier(GLOBAL_NAMESPACE)),
              t.identifier('meta')
            ),
            node.property,
            node.computed
          );

          if (node.optional) {
            replacement = t.optionalMemberExpression(
              replacement.object,
              replacement.property as types.Identifier,
              replacement.computed,
              true
            );
          }

          path.replaceWith(replacement);
        }
      },
    },
  };
}
