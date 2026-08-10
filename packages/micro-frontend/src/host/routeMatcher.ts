import type { HostSkeletonAppConfig } from './types';

export function normalizeHostSkeletonRoutePath(routePath: string) {
  const pathname = routePath.split('#')[0]?.split('?')[0] ?? '/';
  const pathWithLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const normalizedPathname = pathWithLeadingSlash.replace(/\/+/g, '/');

  return normalizedPathname === '/' ? '/' : normalizedPathname.replace(/\/+$/g, '');
}

export function createHostSkeletonRoutePrefix(app: HostSkeletonAppConfig) {
  const scheme = app.scheme.replace(/:$/g, '');
  const appName = normalizeHostSkeletonAppName(app.name);
  const host = app.host == null ? '' : app.host.replace(/^\/+|\/+$/g, '');

  return host.length > 0 ? `${scheme}://${host}/${appName}` : `${scheme}://${appName}`;
}

export function getRoutePathFromUrl(url: string, routePrefix: string) {
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

export function getQueryParamsFromUrl(url: string): Record<string, string> {
  try {
    return Object.fromEntries(new URL(url).searchParams.entries());
  } catch (error) {
    if (!(error instanceof TypeError)) {
      throw error;
    }

    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex === -1) {
      return {};
    }

    const fragmentIndex = url.indexOf('#', questionMarkIndex + 1);
    const queryEndIndex = fragmentIndex === -1 ? url.length : fragmentIndex;

    return Object.fromEntries(new URLSearchParams(url.slice(questionMarkIndex + 1, queryEndIndex)).entries());
  }
}

export function matchRoutePath(pattern: string, routePath: string) {
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

      params[paramName] = decodeRouteSegment(routeSegment);
      continue;
    }

    if (patternSegment !== routeSegment) {
      return null;
    }
  }

  return params;
}

export function normalizeHostSkeletonAppName(appName: string) {
  return appName.replace(/^\/+|\/+$/g, '');
}

function splitRoutePath(routePath: string) {
  const normalizedRoutePath = normalizeHostSkeletonRoutePath(routePath);
  return normalizedRoutePath === '/' ? [] : normalizedRoutePath.slice(1).split('/');
}

function stripSearchAndHash(url: string) {
  return url.split('#')[0]?.split('?')[0] ?? url;
}

function trimTrailingSlash(value: string) {
  return value.length > 1 ? value.replace(/\/+$/g, '') : value;
}

function decodeRouteSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (!(error instanceof URIError)) {
      throw error;
    }

    return value;
  }
}
