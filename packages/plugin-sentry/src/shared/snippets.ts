import { randomUUID } from 'crypto';

// To extract debugId from bundle
export const SENTRY_DEBUG_ID_HOLDER = 'SENTRY_DEBUG_ID';

export function getSentryDebugIdSnippets() {
  const debugId = randomUUID();

  const debugIdHolder = `${SENTRY_DEBUG_ID_HOLDER}=${debugId}`;
  const sourceMappingComment = `//# debugId=${debugId}`;
  const injectionScript = `
  // ${debugIdHolder}
  try {
    var globalObject =
      'undefined' != typeof window
        ? window
        : 'undefined' != typeof global
          ? global
          : 'undefined' != typeof self
            ? self
            : {};

    var stack = new Error().stack;

    if (stack) {
      globalObject._sentryDebugIds = globalObject._sentryDebugIds || {};
      globalObject._sentryDebugIds[stack] = '${debugId}';
      globalObject._sentryDebugIdIdentifier = 'sentry-dbid-${debugId}';
    }
  } catch (e) {}
  `;

  return { injectionScript, sourceMappingComment };
}
