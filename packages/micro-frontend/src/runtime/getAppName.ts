import { getMicroFrontendRuntimeContext, type AppContainer } from './registry';
import { captureStackFrames, resolveCurrentSourceURL, type RuntimeStackFrame } from './runtimeSourceURL';

export function resolveAppNameBySourceURL(
  sourceURL: string,
  containers: Readonly<Record<string, AppContainer>>
): string | null {
  let resolvedAppName: string | null = null;
  for (const container of Object.values(containers)) {
    if (container.runtime?.sourceURL !== sourceURL) {
      continue;
    }
    if (resolvedAppName != null && resolvedAppName !== container.appName) {
      return null;
    }
    resolvedAppName = container.appName;
  }
  return resolvedAppName;
}

export function findAppNameBySourceURL(sourceURL: string): string | null {
  return resolveAppNameBySourceURL(sourceURL, getMicroFrontendRuntimeContext().containers);
}

export function resolveAppNameFromStackFrames(
  frames: readonly RuntimeStackFrame[],
  containers: Readonly<Record<string, AppContainer>>
): string {
  const sourceURL = resolveCurrentSourceURL(frames);
  const appName = resolveAppNameBySourceURL(sourceURL, containers);
  if (appName != null) {
    return appName;
  }

  throw new Error('Cannot resolve the current micro-frontend app name');
}

export function getAppName(): string {
  const sourceURL = resolveCurrentSourceURL(captureStackFrames());
  const appName = findAppNameBySourceURL(sourceURL);
  if (appName != null) {
    return appName;
  }

  throw new Error('Cannot resolve the current micro-frontend app name');
}
