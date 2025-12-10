/**
 * Parser selection utilities for the transform pipeline.
 */

export function isTypeScriptSource(fileName: string): boolean {
  return Boolean(fileName) && fileName.endsWith('.ts');
}

export function isTSXSource(fileName: string): boolean {
  return Boolean(fileName) && fileName.endsWith('.tsx');
}

export function isJavaScriptSource(fileName: string): boolean {
  return Boolean(fileName) && (fileName.endsWith('.js') || fileName.endsWith('.jsx'));
}

export function isJSXSource(fileName: string): boolean {
  return Boolean(fileName) && fileName.endsWith('.jsx');
}

/**
 * Determines if Hermes parser should be used for the given file.
 * Hermes parser is used for .js and .jsx files to natively support Flow types.
 */
export function shouldUseHermesParser(fileName: string): boolean {
  return isJavaScriptSource(fileName);
}

export type SwcParserSyntax = 'typescript' | 'ecmascript';

export interface SwcParserConfig {
  syntax: SwcParserSyntax;
  tsx?: boolean;
  jsx?: boolean;
  exportDefaultFrom?: boolean;
}

/**
 * Get SWC parser configuration based on file extension.
 *
 * Note: We use TypeScript parser for all files (including .js/.jsx) because:
 * 1. React Native 0.81+ uses TypeScript enums in .js files
 * 2. TypeScript parser is a superset that handles both TS and JS
 * 3. Flow types are stripped before SWC processing
 */
export function getSwcParserConfig(fileName: string): SwcParserConfig {
  if (isTypeScriptSource(fileName)) {
    return { syntax: 'typescript', tsx: false };
  }
  // Use TypeScript parser with tsx: true for all other files (.tsx, .js, .jsx)
  // This enables enum support and other TS features in .js files
  return { syntax: 'typescript', tsx: true };
}
