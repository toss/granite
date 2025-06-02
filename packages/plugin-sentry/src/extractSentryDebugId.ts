import { SENTRY_DEBUG_ID_HOLDER } from './snippets';

export function extractSentryDebugId(bundleContent: string) {
  return bundleContent.match(new RegExp(`${SENTRY_DEBUG_ID_HOLDER}=([\\w-]+)`))?.[1];
}
