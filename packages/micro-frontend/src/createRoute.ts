import {
  createRoute as createGraniteRoute,
  type RegisterScreenInput,
  type RouteOptions,
  useNavigation,
} from '@granite-js/react-native';
import {
  type HostSkeletonAppConfig,
  type HostSkeletonComponent,
  type InferInput,
  type InferOutput,
  registerHostSkeletonRoute,
  type StandardSchemaV1Like,
  type ValidateParams,
} from './hostSkeletonStore';

declare module '@granite-js/react-native' {
  interface RouteOptions<T extends Readonly<object | undefined>> {
    skeletonComponent?: HostSkeletonComponent<T>;
  }
}

export type MicroFrontendRouteOptions<TParams extends Readonly<object | undefined>> = RouteOptions<TParams>;

type MicroFrontendRouteResult<TInput, TOutput> = {
  _path: keyof RegisterScreenInput;
  useNavigation: typeof useNavigation;
  useParams: () => TOutput;
  _inputType: TInput;
  _outputType: TOutput;
};

export function createRoute<TSchema extends StandardSchemaV1Like<any, any>>(
  path: keyof RegisterScreenInput,
  options: Omit<RouteOptions<any>, 'validateParams' | 'skeletonComponent'> & {
    validateParams: TSchema;
    skeletonComponent?: HostSkeletonComponent<InferOutput<TSchema>>;
  }
): MicroFrontendRouteResult<InferInput<TSchema>, InferOutput<TSchema>>;
export function createRoute<TParams extends Readonly<object | undefined>>(
  path: keyof RegisterScreenInput,
  options: MicroFrontendRouteOptions<TParams>
): MicroFrontendRouteResult<TParams, TParams>;
export function createRoute(path: unknown, options: RouteOptions<any>) {
  return createRouteWithSkeleton(path, options);
}

function createRouteWithSkeleton(path: unknown, options: RouteOptions<any>) {
  const { skeletonComponent, ...routeOptions } = options;

  if (skeletonComponent != null) {
    registerHostSkeletonRoute(String(path), {
      component: skeletonComponent,
      parserParams: routeOptions.parserParams,
      validateParams: routeOptions.validateParams as ValidateParams<any> | undefined,
    });

    const app = getCurrentGraniteApp();

    if (app != null) {
      registerHostSkeletonRoute(String(path), {
        component: skeletonComponent,
        parserParams: routeOptions.parserParams,
        validateParams: routeOptions.validateParams as ValidateParams<any> | undefined,
        app,
      });
    }
  }

  return createGraniteRoute(path as never, routeOptions as never);
}

function getCurrentGraniteApp(): HostSkeletonAppConfig | null {
  const app = (globalThis as { __granite?: { app?: { name?: string; scheme?: string; host?: string } } }).__granite
    ?.app;

  if (typeof app?.name !== 'string' || app.name.length === 0) {
    return null;
  }

  if (typeof app.scheme !== 'string' || app.scheme.length === 0) {
    return null;
  }

  return {
    name: app.name,
    scheme: app.scheme,
    host: typeof app.host === 'string' ? app.host : '',
  };
}
