import { parseFileSync } from '@swc/core';

/**
 * Checks if Route is exported from the file.
 */
export function checkExportRoute(path: string) {
  try {
    const ast = parseFileSync(path, {
      syntax: 'typescript',
      tsx: true,
    });

    // Check for export { Route } format
    const hasExportSpecifiers = ast.body.some((node) => {
      if (node.type !== 'ExportNamedDeclaration') {
        return false;
      }
      return node.specifiers?.some((specifier) => {
        if (specifier.type !== 'ExportSpecifier') {
          return false;
        }
        return specifier.orig?.value === 'Route';
      });
    });

    if (hasExportSpecifiers) {
      return true;
    }

    // Check for export const Route = ... format
    const hasExportNamedVariable = ast.body.some((node) => {
      if (node.type !== 'ExportDeclaration') {
        return false;
      }
      if (node.declaration.type !== 'VariableDeclaration') {
        return false;
      }

      return node.declaration.declarations.some(
        (declaration) => declaration.id.type === 'Identifier' && declaration.id.value === 'Route'
      );
    });

    return hasExportNamedVariable;
  } catch {
    return false;
  }
}
