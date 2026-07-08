import type { ReactNode } from 'react';

type StandardSchemaResult<TOutput> = {
  value?: TOutput;
  issues?: ReadonlyArray<{ message: string }>;
};

export interface StandardSchemaV1Like<TInput = unknown, TOutput = TInput> {
  readonly '~standard': {
    validate(value: TInput): StandardSchemaResult<TOutput> | Promise<StandardSchemaResult<TOutput>>;
  };
}

export type InferOutput<TSchema> = TSchema extends StandardSchemaV1Like<any, infer TOutput> ? TOutput : never;
export type InferInput<TSchema> = TSchema extends StandardSchemaV1Like<infer TInput, any> ? TInput : never;

export type ParserParams = (params: Record<string, unknown>) => Record<string, unknown>;
export type ValidateParams<TParams> =
  | ((params: Readonly<object | undefined>) => TParams)
  | StandardSchemaV1Like<any, TParams>;

export type HostSkeletonParams<TParams = Readonly<object | undefined>> = TParams extends Readonly<object>
  ? TParams
  : Record<never, never>;

export type HostSkeletonComponent<TParams = Readonly<object | undefined>> = (
  params: HostSkeletonParams<TParams>
) => ReactNode;

export interface RegisterHostSkeletonRouteOptions<TParams = Readonly<object | undefined>> {
  component: HostSkeletonComponent<TParams>;
  parserParams?: ParserParams;
  validateParams?: ValidateParams<TParams>;
  app?: HostSkeletonAppConfig | null;
  appName?: string | null;
}

interface HostSkeletonRouteEntry<TParams = any> {
  id: string;
  routePath: string;
  routePrefix: string | null;
  appName: string | null;
  component: HostSkeletonComponent<TParams>;
  parserParams?: ParserParams;
  validateParams?: ValidateParams<TParams>;
}

interface HostSkeletonStore {
  entries: HostSkeletonRouteEntry[];
  hidden: boolean;
  listeners: Set<() => void>;
  version: number;
}

interface GlobalWithHostSkeletonStore {
  __graniteMicroFrontendHostSkeletonStore?: HostSkeletonStore;
  hideSharedSkeleton?: () => void;
}

export interface HostSkeletonAppConfig {
  name: string;
  scheme: string;
  host?: string | null;
}

export interface HostSkeletonRouteRequest {
  routePath: string;
  params?: Record<string, unknown>;
  appName?: string | null;
  url?: string | null;
}

export interface ResolvedHostSkeleton<TParams = any> {
  component: HostSkeletonComponent<TParams>;
  params: HostSkeletonParams<TParams>;
  url: string | null;
  routePath: string;
  appName: string | null;
}

function getGlobalObject() {
  return globalThis as typeof globalThis & GlobalWithHostSkeletonStore;
}

export function getHostSkeletonStore() {
  const globalObject = getGlobalObject();

  if (globalObject.__graniteMicroFrontendHostSkeletonStore == null) {
    globalObject.__graniteMicroFrontendHostSkeletonStore = {
      entries: [],
      hidden: false,
      listeners: new Set(),
      version: 0,
    };
  }

  return globalObject.__graniteMicroFrontendHostSkeletonStore;
}

function emitHostSkeletonStoreChange() {
  const store = getHostSkeletonStore();
  store.version += 1;
  store.listeners.forEach(listener => {
    listener();
  });
}

export function subscribeHostSkeletonStore(listener: () => void) {
  const store = getHostSkeletonStore();
  store.listeners.add(listener);

  return () => {
    store.listeners.delete(listener);
  };
}

export function getHostSkeletonStoreVersion() {
  return getHostSkeletonStore().version;
}

export function getIsHostSkeletonHidden() {
  return getHostSkeletonStore().hidden;
}

function setHostSkeletonHidden(hidden: boolean) {
  const store = getHostSkeletonStore();

  if (store.hidden === hidden) {
    return;
  }

  store.hidden = hidden;
  emitHostSkeletonStoreChange();
}

export function hideHostSkeleton() {
  setHostSkeletonHidden(true);

  const hideSharedSkeleton = getGlobalObject().hideSharedSkeleton;
  if (typeof hideSharedSkeleton === 'function' && hideSharedSkeleton !== hideHostSkeleton) {
    hideSharedSkeleton();
  }
}

export function resetHostSkeleton() {
  setHostSkeletonHidden(false);
}

export function installHostSkeletonBridge() {
  getGlobalObject().hideSharedSkeleton = hideHostSkeleton;
}

export function normalizeHostSkeletonRoutePath(routePath: string) {
  const pathname = routePath.split('#')[0]?.split('?')[0] ?? '/';
  const pathWithLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const normalizedPathname = pathWithLeadingSlash.replace(/\/+/g, '/');

  return normalizedPathname === '/' ? '/' : normalizedPathname.replace(/\/+$/g, '');
}

export function createHostSkeletonRoutePrefix(app: HostSkeletonAppConfig) {
  const scheme = normalizeScheme(app.scheme);
  const appName = normalizeAppName(app.name);
  const host = normalizeHost(app.host);

  return host.length > 0 ? `${scheme}://${host}/${appName}` : `${scheme}://${appName}`;
}

export function registerHostSkeletonRoute<TParams = Readonly<object | undefined>>(
  routePath: string,
  options: RegisterHostSkeletonRouteOptions<TParams>
) {
  const store = getHostSkeletonStore();
  const normalizedRoutePath = normalizeHostSkeletonRoutePath(routePath);
  const appName = normalizeOptionalAppName(options.appName ?? options.app?.name);
  const routePrefix = options.app == null ? null : createHostSkeletonRoutePrefix(options.app);
  const id = `${routePrefix ?? appName ?? '*'}:${normalizedRoutePath}`;
  const entry: HostSkeletonRouteEntry<TParams> = {
    id,
    routePath: normalizedRoutePath,
    routePrefix,
    appName,
    component: options.component,
    parserParams: options.parserParams,
    validateParams: options.validateParams,
  };
  const existingIndex = store.entries.findIndex(item => item.id === id);

  if (existingIndex >= 0) {
    store.entries[existingIndex] = entry;
  } else {
    store.entries.push(entry);
  }

  emitHostSkeletonStoreChange();
}

export function resolveHostSkeleton(request: HostSkeletonRouteRequest | string): ResolvedHostSkeleton | null {
  const matched = findHostSkeletonRouteEntry(request);

  if (matched == null) {
    return null;
  }

  const parsedParams = (matched.entry.parserParams ?? defaultParserParams)({
    ...matched.pathParams,
    ...matched.params,
  });

  let params: unknown = parsedParams;

  if (matched.entry.validateParams != null) {
    try {
      params = validateRouteParams(matched.entry.validateParams, parsedParams);
    } catch {
      return null;
    }
  }

  return {
    component: matched.entry.component,
    params: toHostSkeletonParams(params),
    url: matched.url,
    routePath: matched.routePath,
    appName: matched.entry.appName,
  };
}

function toHostSkeletonParams<TParams>(params: TParams): HostSkeletonParams<TParams> {
  return (params ?? {}) as HostSkeletonParams<TParams>;
}

function findHostSkeletonRouteEntry(request: HostSkeletonRouteRequest | string) {
  return typeof request === 'string'
    ? findHostSkeletonRouteEntryByUrl(request)
    : findHostSkeletonRouteEntryByRequest(request);
}

function findHostSkeletonRouteEntryByUrl(url: string) {
  const entries = getHostSkeletonStore().entries;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];

    if (entry == null || entry.routePrefix == null) {
      continue;
    }

    const routePath = getRoutePathFromUrl(url, entry.routePrefix);

    if (routePath == null) {
      continue;
    }

    const pathParams = matchRoutePath(entry.routePath, routePath);

    if (pathParams == null) {
      continue;
    }

    return {
      entry,
      pathParams,
      params: getQueryParamsFromUrl(url),
      routePath,
      url,
    };
  }

  return null;
}

function findHostSkeletonRouteEntryByRequest(request: HostSkeletonRouteRequest) {
  const entries = getHostSkeletonStore().entries;
  const appName = normalizeOptionalAppName(request.appName);
  let fallbackMatch: {
    entry: HostSkeletonRouteEntry;
    pathParams: Record<string, string>;
    params: Record<string, unknown>;
    routePath: string;
    url: string | null;
  } | null = null;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];

    if (entry == null) {
      continue;
    }

    if (entry.appName != null && entry.appName !== appName) {
      continue;
    }

    const routePath = normalizeHostSkeletonRoutePath(request.routePath);
    const pathParams = matchRoutePath(entry.routePath, routePath);

    if (pathParams == null) {
      continue;
    }

    const match = {
      entry,
      pathParams,
      params: request.params ?? {},
      routePath,
      url: request.url ?? null,
    };

    if (entry.appName === appName) {
      return match;
    }

    fallbackMatch ??= match;
  }

  return fallbackMatch;
}

function getRoutePathFromUrl(url: string, routePrefix: string) {
  const normalizedPrefix = trimTrailingSlash(routePrefix);
  const urlWithoutSearch = trimTrailingSlash(stripSearchAndHash(url));

  if (urlWithoutSearch === normalizedPrefix) {
    return '/';
  }

  if (!urlWithoutSearch.startsWith(`${normalizedPrefix}/`)) {
    return null;
  }

  return normalizeHostSkeletonRoutePath(urlWithoutSearch.slice(normalizedPrefix.length));
}

function getQueryParamsFromUrl(url: string): Record<string, string> {
  try {
    const searchParams = new URL(url).searchParams;

    return Object.fromEntries(searchParams.entries());
  } catch {
    const queryString = getQueryString(url);

    return queryString == null ? {} : Object.fromEntries(new URLSearchParams(queryString).entries());
  }
}

function getQueryString(url: string) {
  const questionMarkIndex = url.indexOf('?');

  if (questionMarkIndex === -1) {
    return null;
  }

  const fragmentIndex = url.indexOf('#', questionMarkIndex + 1);
  const queryEndIndex = fragmentIndex === -1 ? url.length : fragmentIndex;

  return url.slice(questionMarkIndex + 1, queryEndIndex);
}

function stripSearchAndHash(url: string) {
  return url.split('#')[0]?.split('?')[0] ?? url;
}

function trimTrailingSlash(value: string) {
  return value.length > 1 ? value.replace(/\/+$/g, '') : value;
}

function matchRoutePath(pattern: string, routePath: string) {
  const patternSegments = splitRoutePath(pattern);
  const routeSegments = splitRoutePath(routePath);

  if (patternSegments.length !== routeSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const routeSegment = routeSegments[index];

    if (patternSegment == null || routeSegment == null) {
      return null;
    }

    if (patternSegment.startsWith(':')) {
      const paramName = patternSegment.slice(1);

      if (paramName.length === 0) {
        return null;
      }

      params[paramName] = safeDecodeURIComponent(routeSegment);
      continue;
    }

    if (patternSegment !== routeSegment) {
      return null;
    }
  }

  return params;
}

function splitRoutePath(routePath: string) {
  const normalizedRoutePath = normalizeHostSkeletonRoutePath(routePath);

  return normalizedRoutePath === '/' ? [] : normalizedRoutePath.slice(1).split('/');
}

function defaultParserParams(params: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value !== 'string') {
        return [key, value];
      }

      try {
        return [key, JSON.parse(value)];
      } catch {
        return [key, value];
      }
    })
  );
}

function validateRouteParams<TParams>(
  validateParams: ValidateParams<TParams>,
  parsedParams: Readonly<object | undefined>
): TParams {
  if (isStandardSchema(validateParams)) {
    const result = validateParams['~standard'].validate(parsedParams);

    if (result instanceof Promise) {
      throw new Error('Async validation is not supported');
    }

    if ('issues' in result && result.issues != null) {
      const messages = result.issues.map(issue => issue.message).join(', ');
      throw new Error(`Parameter validation failed: ${messages}`);
    }

    return result.value as TParams;
  }

  return validateParams(parsedParams);
}

function isStandardSchema(value: unknown): value is StandardSchemaV1Like {
  return typeof value === 'object' && value !== null && '~standard' in value;
}

function normalizeScheme(scheme: string) {
  return scheme.replace(/:$/g, '');
}

function normalizeHost(host: string | null | undefined) {
  return host == null ? '' : host.replace(/^\/+|\/+$/g, '');
}

function normalizeAppName(appName: string) {
  return appName.replace(/^\/+|\/+$/g, '');
}

function normalizeOptionalAppName(appName: string | null | undefined) {
  return appName == null || appName.length === 0 ? null : normalizeAppName(appName);
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function resetHostSkeletonStoreForTest() {
  const store = getHostSkeletonStore();
  store.entries = [];
  store.hidden = false;
  store.version = 0;
  emitHostSkeletonStoreChange();
}
