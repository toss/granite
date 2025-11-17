import {
  type ParamListBase,
  useNavigation as useNavigationNative,
  useRoute,
} from '@granite-js/native/@react-navigation/native';
import {
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from '@granite-js/native/@react-navigation/native-stack';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { useMemo } from 'react';
import { RESERVED_PATHS } from './constants';
import { defaultParserParams } from './utils/defaultParserParams';
import { type InferOutput, type InferInput } from './utils/standardSchema';
import { validateRouteParams } from './utils/validateRouteParams';

export interface RouteOptions<T extends Readonly<object | undefined>> {
  parserParams?: (params: Record<string, unknown>) => Record<string, unknown>;
  validateParams?: ((params: Readonly<object | undefined>) => T) | StandardSchemaV1<any, T>;
  component: React.FC<any>;
  screenOptions?: NativeStackNavigationOptions | ((context: { params: T }) => NativeStackNavigationOptions);
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RegisterScreenInput {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RegisterScreen {}

export type NavigationProps = NativeStackNavigationProp<
  // @ts-expect-error - override type
  keyof RegisterScreenInput extends never ? ParamListBase : RegisterScreenInput
>;

export function useNavigation() {
  return useNavigationNative<NavigationProps>();
}

export type RouteHooksOptions<TScreen extends keyof RegisterScreen> =
  | {
      from: TScreen;
      strict?: true;
    }
  | {
      strict: false;
      from?: never;
    };

export const routeMap = new Map<
  keyof RegisterScreenInput,
  {
    options: Omit<RouteOptions<any>, 'component' | 'screenOptions'>;
    component: React.FC<any>;
    screenOptions?: NativeStackNavigationOptions | ((context: { params: any }) => NativeStackNavigationOptions);
  }
>();

export function useMatchOptions<TScreen extends keyof RegisterScreen>(options: RouteHooksOptions<TScreen>) {
  const route = useRoute();
  const from = 'from' in options ? options.from : (route.name as TScreen);
  const strict = 'from' in options ? true : options.strict;

  if (strict && from !== route.name) {
    throw new Error(`Cannot access parameters from route '${from}' in current route '${route.name}'`);
  }

  return useMemo(() => {
    if (!from) {
      return null;
    }

    if (!(routeMap.has(from) || RESERVED_PATHS.includes(from))) {
      throw new Error(`Route '${from}' is not registered`);
    }

    const routeOptions = routeMap.get(from);
    return {
      ...routeOptions?.options,
      parserParams: routeOptions?.options.parserParams ?? defaultParserParams,
    };
  }, [from]);
}

export function useParams<TScreen extends keyof RegisterScreen>(options: {
  from: TScreen;
  strict?: true;
}): RegisterScreen[TScreen];
export function useParams(options: { strict: false }): Readonly<object | undefined>;

/**
 * @public
 * @category Screen Control
 * @name useParams
 * @description
 *
 * `useParams` is a hook that retrieves parameters from a specified route.
 * Using this hook, you can easily access parameters of the current route.
 * With the `validateParams` option, you can validate parameter structure and transform types,
 * reducing runtime errors and writing safer code.
 *
 * @param {RouteHooksOptions<TScreen>} options Object containing information about the route to retrieve.
 * @param {string} [options.from] Route path to retrieve parameters from. If not specified, retrieves parameters from the current route. Must be specified when strict mode is true.
 * @param {boolean} [options.strict] Strict mode setting. When set to true, throws an error if the specified route doesn't match the current route. When set to false, skips validateParams validation and returns parameters of the current screen as is.
 *
 * @example
 * ### Retrieving Route Parameters
 *
 *
 * ::: code-group
 *
 * ```tsx [pages/examples/use-params.tsx]
 * import React from 'react';
 * import { Text } from 'react-native';
 * import { createRoute, useParams } from '@granite-js/react-native';
 *
 * export const Route = createRoute('/examples/use-params', {
 *   validateParams: (params) => params as { id: string },
 *   component: UseParamsExample,
 * });
 *
 * function UseParamsExample() {
 *   // First method: Using the useParams method of the route object
 *   const params = Route.useParams();
 *
 *   // Second method: Using the useParams hook directly
 *   const params2 = useParams({ from: '/examples/use-params' });
 *
 *   // Third method: Using with strict mode set to false
 *   // When strict is false, retrieves parameters from the current route
 *   // and skips validation even if validateParams is defined
 *   const params3 = useParams({ strict: false }) as { id: string };
 *
 *   return (
 *     <>
 *       <Text>{params.id}</Text>
 *       <Text>{params2.id}</Text>
 *       <Text>{params3.id}</Text>
 *     </>
 *   );
 * }
 * ```
 * :::
 */
export function useParams<TScreen extends keyof RegisterScreen>(
  options: RouteHooksOptions<TScreen>
): TScreen extends keyof RegisterScreen ? RegisterScreen[TScreen] : Readonly<object | undefined> {
  const routeOptions = useMatchOptions(options);
  const route = useRoute();

  const isStrict = typeof options.from === 'string' ? true : options.strict;
  const params = useMemo(() => {
    if (!routeOptions) {
      return (route.params ?? {}) as Readonly<object | undefined>;
    }

    const parsedParams = routeOptions.parserParams(route.params as Record<string, string>);

    if (!isStrict || !routeOptions.validateParams) {
      return parsedParams;
    }

    return validateRouteParams(routeOptions.validateParams, parsedParams);
  }, [routeOptions, route.params, isStrict]);

  return params;
}

// Overload 1: StandardSchema pattern
export function createRoute<TSchema extends StandardSchemaV1<any, any>>(
  path: keyof RegisterScreenInput,
  options: Omit<RouteOptions<any>, 'validateParams'> & {
    validateParams: TSchema;
  }
): {
  _path: keyof RegisterScreenInput;
  useNavigation: typeof useNavigation;
  useParams: () => InferOutput<TSchema>;
  _inputType?: InferInput<TSchema>;
  _outputType?: InferOutput<TSchema>;
};

// Overload 2: Function pattern
export function createRoute<T extends Readonly<object | undefined>>(
  path: keyof RegisterScreenInput,
  options: RouteOptions<T>
): {
  _path: keyof RegisterScreenInput;
  useNavigation: typeof useNavigation;
  useParams: () => T;
  _inputType?: T;
  _outputType?: T;
};

// Implementation
export function createRoute(path: keyof RegisterScreenInput, options: RouteOptions<any>) {
  const { component, screenOptions, ...restOptions } = options;
  routeMap.set(path, {
    options: restOptions,
    component,
    screenOptions: screenOptions,
  });

  const _path = path as keyof RegisterScreenInput;
  return {
    _path,
    useNavigation,
    useParams: () => useParams({ from: _path as keyof RegisterScreen, strict: true }),
  };
}
