import { getRoutePath } from './path';
import { routeMap } from '../createRoute';
import { RequireContext, RouteScreen } from '../types';

/**
 * @kind function
 * @name getRouteScreens
 * @description
 * Gets screens from the pages folder.
 *
 * @param {RequireContext} context - Object containing information about screens in Router
 * @returns {RouteScreen[]} screens - Returns a list of screens that can be navigated to.
 *
 * @example
 * ```tsx
 * import { getRouteScreens } from '@granite-js/react-native';
 *
 * const context = require.context('../pages');
 * const screens = getRouteScreens(context);
 * ```
 */
export function getRouteScreens(context: RequireContext): RouteScreen[] {
  const screens = context.keys().map((key) => {
    const path = getRoutePath(key);

    /**
     * Keep export default option for backward compatibility.
     * If migrated to type-safe, only export Route will be needed.
     */
    const component = context(key)?.default ?? routeMap.get(context(key)?.Route?._path)?.component;

    if (component == null) {
      throw new Error(`Page component not found in ${key}.`);
    }

    return {
      path,
      component,
    };
  });

  return screens;
}

/**
 * @kind function
 * @name getScreenPathMapConfig
 * @description Maps paths of screens.
 *
 * @param {RouteScreen[]} routeScreens - List of screens that can be navigated to
 */
export function getScreenPathMapConfig(routeScreens: RouteScreen[]) {
  const screensConfig: ScreenPath = {};

  routeScreens.forEach((routeScreen) => {
    const routePath = routeScreen.path;

    if (screensConfig[routePath] != null) {
      throw new Error(`${routePath} is already registered. Please check for duplicate paths.`);
    }

    screensConfig[routePath] = {
      path: routePath,
    };
  });

  // @see https://reactnavigation.org/docs/configuring-links/#matching-exact-paths
  // This is a mapping for the root path ('/') for deep link handling.
  // Example: To handle URLs like scheme://{service_name}?name=John,
  // map the root path to an empty string to correctly extract query parameters.
  screensConfig['/'] = {
    path: '',
  };

  // https://reactnavigation.org/docs/configuring-links/#handling-unmatched-routes-or-404
  screensConfig['/_404'] = {
    path: '*',
  };

  return screensConfig;
}

/**
 * @name ScreenPath
 * @description
 * Type representing screen paths.
 *
 * @typedef {Record<string, { path?: string }>} ScreenPath
 */
export type ScreenPath = Record<
  string,
  {
    path?: string;
  }
>;
