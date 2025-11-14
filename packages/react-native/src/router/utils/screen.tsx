import { getRoutePath } from './path';
import { routeMap } from '../createRoute';
import { RequireContext, RouteScreen } from '../types';
import { validateRouteParams } from './validateRouteParams';

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

    // Retrieve route configuration from routeMap
    const routeMapEntry = routeMap.get(context(key)?.Route?._path);

    // Get screenOptions from routeMap or component (routeMap takes priority)
    const rawScreenOptions = routeMapEntry?.screenOptions ?? component.screenOptions;

    // If screenOptions is a function, wrap it to apply parserParams and validateParams
    const screenOptions =
      typeof rawScreenOptions === 'function'
        ? ({ route }: { route: { params?: Record<string, unknown> }; navigation: unknown }) => {
            const rawParams = route.params ?? {};
            const parserParams = routeMapEntry?.options?.parserParams;
            const validateParams = routeMapEntry?.options?.validateParams;

            // Apply parserParams if available
            const parsedParams = parserParams ? parserParams(rawParams) : rawParams;

            // Apply validateParams if available
            try {
              const validatedParams = validateParams ? validateRouteParams(validateParams, parsedParams) : parsedParams;
              return rawScreenOptions({ params: validatedParams });
            } catch {
              return rawScreenOptions({ params: { _error: true } });
            }
          }
        : rawScreenOptions;

    return {
      path,
      component,
      screenOptions,
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

  const notFoundPage = routeScreens.find((screen) => screen.path === '/_404');

  if (notFoundPage == null) {
    throw new Error('404 page not found. Please create a `_404.ts` or `_404.tsx` file in the `pages/*` folder.');
  }

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
