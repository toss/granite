import {
  createRoute as createGraniteRoute,
  type RegisterScreenInput,
  type RouteOptions,
  useNavigation,
} from '@granite-js/react-native';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  registerHostSkeletonRoute,
} from './host/hostSkeletonStore';
import type { HostSkeletonAppConfig, HostSkeletonComponent } from './host/types';

declare module '@granite-js/react-native' {
  interface RouteOptions<T extends Readonly<object | undefined>> {
    skeletonComponent?: HostSkeletonComponent<T>;
  }
}

export type MicroFrontendRouteOptions<TParams extends Readonly<object> | undefined> = RouteOptions<TParams>;

type SetParamsFunction<TParams> = (params: TParams extends undefined ? undefined : Partial<TParams>) => void;
type ReplaceParamsFunction<TParams> = (params: TParams extends undefined ? undefined : TParams) => void;

type MicroFrontendRouteResult<TInput, TOutput> = {
  readonly _path: keyof RegisterScreenInput;
  readonly useNavigation: typeof useNavigation;
  readonly useParams: () => TOutput;
  readonly useSetParams: () => SetParamsFunction<TInput>;
  readonly useReplaceParams: () => ReplaceParamsFunction<TInput>;
  readonly _inputType: TInput;
  readonly _outputType: TOutput;
};

export function createRoute<
  TSchema extends StandardSchemaV1<unknown, Readonly<object> | undefined>,
>(
  path: keyof RegisterScreenInput,
  options: Omit<
    RouteOptions<StandardSchemaV1.InferOutput<TSchema>>,
    'validateParams' | 'skeletonComponent'
  > & {
    readonly validateParams: TSchema;
    readonly skeletonComponent?: HostSkeletonComponent<StandardSchemaV1.InferOutput<TSchema>>;
  }
): MicroFrontendRouteResult<StandardSchemaV1.InferInput<TSchema>, StandardSchemaV1.InferOutput<TSchema>>;
export function createRoute<TParams extends Readonly<object> | undefined>(
  path: keyof RegisterScreenInput,
  options: MicroFrontendRouteOptions<TParams>
): MicroFrontendRouteResult<TParams, TParams>;
export function createRoute<TParams extends Readonly<object> | undefined>(
  path: keyof RegisterScreenInput,
  options: MicroFrontendRouteOptions<TParams>
) {
  const { skeletonComponent, ...routeOptions } = options;

  if (skeletonComponent != null) {
    registerHostSkeletonRoute(String(path), {
      component: skeletonComponent,
      parserParams: routeOptions.parserParams,
      validateParams: routeOptions.validateParams,
    });

    const app = getCurrentGraniteApp();
    if (app != null) {
      registerHostSkeletonRoute(String(path), {
        component: skeletonComponent,
        parserParams: routeOptions.parserParams,
        validateParams: routeOptions.validateParams,
        app,
      });
    }
  }

  return createGraniteRoute(path, routeOptions);
}

function getCurrentGraniteApp(): HostSkeletonAppConfig | null {
  const granite: unknown = Reflect.get(globalThis, '__granite');
  if (!isPropertyMap(granite)) {
    return null;
  }

  const app = granite['app'];
  if (!isPropertyMap(app)) {
    return null;
  }

  const name = app['name'];
  const scheme = app['scheme'];
  const host = app['host'];

  if (typeof name !== 'string' || name.length === 0) {
    return null;
  }

  if (typeof scheme !== 'string' || scheme.length === 0) {
    return null;
  }

  return {
    name,
    scheme,
    host: typeof host === 'string' ? host : '',
  };
}

function isPropertyMap(value: unknown): value is Readonly<Record<PropertyKey, unknown>> {
  return typeof value === 'object' && value !== null;
}
