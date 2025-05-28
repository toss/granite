import { getFileNameFromPath } from './path';
import type { RouteScreen } from '../types/RouteScreen';

/**
 * Extracts only the directory path from a given file path
 * Example) './about/test' -> './about'
 * Example) './about'     -> '.' (default logic)
 *  but... For testing, if the path is included in 'layoutDirs', return as is
 */
function getDirectoryPath(filePath: string, layoutDirs: Set<string>): string {
  // If included in layoutDirs, this path itself is a directory-based route
  if (layoutDirs.has(filePath)) {
    return filePath;
  }

  const lastSlashIndex = filePath.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    // If there's no slash, treat as '.'
    return '.';
  }
  const dirPath = filePath.substring(0, lastSlashIndex);
  return dirPath === '' ? '.' : dirPath;
}

/**
 * Get parent directory path
 * Example) './nested/deep' -> './nested'
 * Example) './nested' -> '.'
 * Example) '.' -> '' (no more parent)
 */
function getParentDirectory(dirPath: string): string {
  if (dirPath === '.' || dirPath === '') {
    return '';
  }
  const idx = dirPath.lastIndexOf('/');
  if (idx === -1) {
    return '.';
  }
  const parent = dirPath.substring(0, idx);
  return parent === '' ? '.' : parent;
}

/**
 * @name createParentRouteScreenMap
 * @description
 *   Finds a specific keyword in a given list of files and
 *   maps each page/layout to use its "nearest parent layout"
 */
export function createParentRouteScreenMap(routeScreens: RouteScreen[], keyword: string): Map<string, RouteScreen> {
  // 1) Find keyword files and record their directories in layoutDirs set
  //    Example) "./about/[keyword]" -> layoutDirs.add("./about")
  const layoutDirs = new Set<string>();
  const layoutScreens = new Map<string, RouteScreen>();

  for (const screen of routeScreens) {
    const fileName = getFileNameFromPath(screen.path, { withExtension: false });
    if (fileName === keyword) {
      const dirPath = screen.path.substring(0, screen.path.lastIndexOf('/'));
      layoutDirs.add(dirPath || '.'); // Store directory path like './about'
    }
  }

  // 2) Create layoutScreens (directory->keyword file) mapping
  for (const screen of routeScreens) {
    const fileName = getFileNameFromPath(screen.path, { withExtension: false });
    if (fileName === keyword) {
      // The directory this keyword file belongs to is already in layoutDirs
      // dirPath: './about', './nested', etc.
      const dirPath = getDirectoryPath(screen.path, layoutDirs);
      layoutScreens.set(dirPath, screen);
    }
  }

  /**
   * 3) Function to find the nearest layout by traversing up parent directories
   *    - skipSameDir: whether to check from own directory or from parent
   *
   *    memo: (dirPath + '|' + skipSameDir) -> RouteScreen | undefined
   */
  const memo = new Map<string, RouteScreen | undefined>();

  function findNearestLayout(dir: string, skipSameDir = false): RouteScreen | undefined {
    const cacheKey = dir + '|' + skipSameDir;
    if (memo.has(cacheKey)) {
      return memo.get(cacheKey);
    }

    let current = dir;

    if (skipSameDir) {
      current = getParentDirectory(current);
    }

    while (current) {
      if (layoutScreens.has(current)) {
        const foundLayout = layoutScreens.get(current);
        memo.set(cacheKey, foundLayout);
        return foundLayout;
      }
      if (current === '.' || current === '') {
        break;
      }
      current = getParentDirectory(current);
    }

    memo.set(cacheKey, undefined);
    return undefined;
  }

  // 4) Finally create "path -> parent layout" mapping
  const parentRouteScreenMap = new Map<string, RouteScreen>();

  for (const screen of routeScreens) {
    const fileName = getFileNameFromPath(screen.path, { withExtension: false });

    // Get the "directory" this file (or directory) belongs to
    const dirPath = getDirectoryPath(screen.path, layoutDirs);

    if (fileName === keyword) {
      // (1) If this is a keyword file, search for layout in "parent directory"
      //     => must skip self (skipSameDir=true)
      const parentLayout = findNearestLayout(dirPath, true);
      if (parentLayout) {
        parentRouteScreenMap.set(screen.path, parentLayout);
      }
    } else {
      // (2) If it's a regular page (or regular file), search for layout from own directory up
      const nearestLayout = findNearestLayout(dirPath, false);
      if (nearestLayout) {
        parentRouteScreenMap.set(screen.path, nearestLayout);
      }
    }
  }

  return parentRouteScreenMap;
}
