import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ReactNode } from 'react';

export type PendingHostComponentParams<TParams extends Readonly<object> | undefined = undefined> =
  TParams extends Readonly<object> ? TParams : Readonly<Record<string, never>>;

export type PendingHostComponentRenderer<TParams extends Readonly<object> | undefined = undefined> = {
  bivarianceHack(params: PendingHostComponentParams<TParams>): ReactNode;
}['bivarianceHack'];

export type ParserParams = (params: Record<string, unknown>) => Record<string, unknown>;

export type ValidateParams<TParams extends Readonly<object> | undefined> =
  | ((params: Readonly<object> | undefined) => TParams)
  | StandardSchemaV1<unknown, TParams>;

export interface PendingHostComponentAppConfig {
  readonly name: string;
  readonly scheme: string;
  readonly host?: string | null;
}

export interface RegisterPendingHostComponentRouteOptions<
  TParams extends Readonly<object> | undefined = undefined,
> {
  readonly component: PendingHostComponentRenderer<TParams>;
  readonly parserParams?: ParserParams;
  readonly validateParams?: ValidateParams<TParams>;
  readonly app: PendingHostComponentAppConfig;
}

export interface PendingHostComponentRouteRequest {
  readonly routePath: string;
  readonly params?: Record<string, unknown>;
  readonly appName: string;
  readonly url?: string | null;
}

export interface ResolvedPendingHostComponent {
  readonly component: PendingHostComponentRenderer<Readonly<object>>;
  readonly params: Readonly<object>;
  readonly url: string | null;
  readonly routePath: string;
  readonly appName: string | null;
}
