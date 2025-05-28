import { matchDynamicName } from './matchers';

/**
 * Converts Windows-style paths to Posix-based paths.
 *
 * @example
 * ```ts
 * toPosixBasedPath(".\\index.tsx") // "./index.tsx"
 * toPosixBasedPath("..\\..\\index.tsx") // "../../index.tsx"
 * ```
 */
function toPosixBasedPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * @name excludeFileExtension
 * @description Removes file extension.
 */
export function excludeFileExtension(name: string): string {
  return name.replace(/\.(tsx|jsx|ts|js)$/g, '');
}

/**
 * @name excludeRelativePath
 * @description Removes relative path from path.
 * @example
 * ```ts
 * excludeRelativePath("./index.tsx") // "index.tsx"
 * excludeRelativePath("./list/detail.tsx") // "list/detail.tsx"
 * excludeRelativePath("../../index.tsx") // "index.tsx"
 * ```
 */
export function excludeRelativePath(filePath: string): string {
  return filePath.replace(/^(?:\.\.?\/)+/g, '');
}

/**
 * @name excludeDynamicNamePattern
 * @description Removes `[` `]` from dynamic route pattern.
 * @example
 * ```ts
 * excludeDynamicNamePattern("[id]") // "id"
 * excludeDynamicNamePattern("[id]/[name]") // "id/name"
 * ```
 */
export function excludeDynamicNamePattern(filePath: string): string {
  return filePath.replace(/\[|\]/g, '');
}

/**
 * @name getRoutePath
 * @description Converts to route path.
 * @example
 * ```ts
 * getRoutePath('./index.tsx') // "/"
 * getRoutePath('./list/index.tsx') // "/list"
 * getRoutePath('./list/detail.tsx') // "/list/detail"
 * getRoutePath('./list/[id].js') // "/list/:id"
 * ```
 */
export function getRoutePath(filePath: string): string {
  const posixBasedPath = toPosixBasedPath(filePath);
  const normalPath = excludeRelativePath(excludeFileExtension(posixBasedPath));

  const routePath = normalPath
    .split('/')
    .map((segment) => {
      if (segment === 'index') {
        return '';
      }

      if (matchDynamicName(segment)) {
        return `:${excludeDynamicNamePattern(segment)}`;
      }

      return segment;
    })
    .filter((segment) => segment.length > 0)
    .join('/');

  return '/' + routePath;
}

/**
 * @name getFileNameFromPath
 * @description Extracts filename from file path.
 * @example
 * ```ts
 * getFileNameFromPath('/path/to/file.txt') // "file.txt"
 * getFileNameFromPath('file.txt') // "file.txt"
 * getFileNameFromPath('') // ""
 * getFileNameFromPath('/path/to/directory/') // ""
 * getFileNameFromPath('/path/to/file.txt', { withExtension: false }) // "file"
 * ```
 */
export function getFileNameFromPath(
  filePath: string,
  options: { withExtension?: boolean } = {
    withExtension: true,
  }
): string {
  const fileName = filePath.split('/').pop() || '';
  return options.withExtension ? fileName : fileName.replace(/\.[^.]+$/g, '');
}
