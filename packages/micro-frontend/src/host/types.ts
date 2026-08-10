import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { ReactNode } from 'react';

export type HostSkeletonParams<TParams extends Readonly<object> | undefined = undefined> =
  TParams extends Readonly<object> ? TParams : Readonly<Record<string, never>>;

export type HostSkeletonComponent<TParams extends Readonly<object> | undefined = undefined> = {
  bivarianceHack(params: HostSkeletonParams<TParams>): ReactNode;
}['bivarianceHack'];

export type ParserParams = (params: Record<string, unknown>) => Record<string, unknown>;

export type ValidateParams<TParams extends Readonly<object> | undefined> =
  | ((params: Readonly<object> | undefined) => TParams)
  | StandardSchemaV1<unknown, TParams>;

export interface HostSkeletonAppConfig {
  readonly name: string;
  readonly scheme: string;
  readonly host?: string | null;
}

export interface RegisterHostSkeletonRouteOptions<
  TParams extends Readonly<object> | undefined = undefined,
> {
  readonly component: HostSkeletonComponent<TParams>;
  readonly parserParams?: ParserParams;
  readonly validateParams?: ValidateParams<TParams>;
  readonly app: HostSkeletonAppConfig;
}

export interface HostSkeletonRouteRequest {
  readonly routePath: string;
  readonly params?: Record<string, unknown>;
  readonly appName: string;
  readonly url?: string | null;
}

export interface ResolvedHostSkeleton {
  readonly component: HostSkeletonComponent<Readonly<object>>;
  readonly params: Readonly<object>;
  readonly url: string | null;
  readonly routePath: string;
  readonly appName: string | null;
}
