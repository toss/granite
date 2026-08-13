import {
  createRoute as createGraniteRoute,
  getSchemeUri,
  type RegisterScreenInput,
  type RouteOptions,
  useNavigation,
} from '@granite-js/react-native';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { registerPendingHostComponentRoute } from './host/pendingHostComponentStore';
import type { PendingHostComponentAppConfig, PendingHostComponentRenderer } from './host/types';

export type MicroFrontendRouteOptions<TParams extends Readonly<object> | undefined> = RouteOptions<TParams> & {
  readonly hostPendingComponent?: PendingHostComponentRenderer<TParams>;
};

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

export function createRoute<TSchema extends StandardSchemaV1<unknown, Readonly<object> | undefined>>(
  path: keyof RegisterScreenInput,
  options: Omit<RouteOptions<StandardSchemaV1.InferOutput<TSchema>>, 'validateParams'> & {
    readonly validateParams: TSchema;
    readonly hostPendingComponent?: PendingHostComponentRenderer<StandardSchemaV1.InferOutput<TSchema>>;
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
  const { hostPendingComponent, ...routeOptions } = options;

  if (hostPendingComponent != null) {
    const app = getCurrentGraniteApp();
    if (app != null) {
      registerPendingHostComponentRoute(String(path), {
        app,
        component: hostPendingComponent,
        parserParams: routeOptions.parserParams,
        validateParams: routeOptions.validateParams,
      });
    }
  }

  return createGraniteRoute(path, routeOptions);
}

function getCurrentGraniteApp(): PendingHostComponentAppConfig | null {
  const granite: unknown = Reflect.get(globalThis, '__granite');
  if (!isPropertyMap(granite) || !isPropertyMap(granite['app'])) {
    return null;
  }

  const host = granite['app']['host'];
  const name = granite['app']['name'];
  if (typeof host !== 'string' || typeof name !== 'string') {
    return null;
  }

  const scheme = new URL(getSchemeUri()).protocol.replace(/:$/g, '');

  return {
    name,
    scheme,
    host,
  };
}

function isPropertyMap(value: unknown): value is Readonly<Record<PropertyKey, unknown>> {
  return typeof value === 'object' && value !== null;
}
