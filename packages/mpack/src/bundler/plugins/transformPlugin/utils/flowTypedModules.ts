/**
 * List of Flow-typed modules that need Flow type stripping.
 * Based on Re.pack's FLOW_TYPED_MODULES pattern.
 */
export const FLOW_TYPED_MODULES = [
  'react-native',
  '@react-native',
];

/**
 * Generates regular expressions for matching module paths in both
 * classic (npm, yarn) and exotic (pnpm) formats.
 */
function getModulePaths(moduleNames: string[]): RegExp[] {
  return moduleNames.flatMap((moduleName) => {
    const escapedClassic = moduleName.replace(/[/\\]/g, '[/\\\\]');
    const escapedExotic = moduleName.replace(/[/\\]/g, '\\+');

    const classicPath = new RegExp(
      `node_modules([/\\\\])+${escapedClassic}[/\\\\]`
    );
    const exoticPath = new RegExp(
      `node_modules(.*[/\\\\])+${escapedExotic}[@\\+]`
    );

    return [classicPath, exoticPath];
  });
}

export interface FlowTypedModuleOptions {
  include?: string[];
  exclude?: string[];
}

/**
 * Check if a file path matches a Flow-typed module.
 */
export function isFlowTypedModule(
  filePath: string,
  options: FlowTypedModuleOptions = {}
): boolean {
  const { include = FLOW_TYPED_MODULES, exclude = [] } = options;

  // Skip if not in node_modules
  if (!filePath.includes('node_modules')) {
    return false;
  }

  // Check exclude first
  if (exclude.length > 0) {
    const excludePatterns = getModulePaths(exclude);
    if (excludePatterns.some((pattern) => pattern.test(filePath))) {
      return false;
    }
  }

  // Check include
  const includePatterns = getModulePaths(include);
  return includePatterns.some((pattern) => pattern.test(filePath));
}
