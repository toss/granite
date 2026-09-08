import type { PendingHostComponentAppConfig } from './types';
import { findCurrentAppName } from '../runtime/getAppName';
import { getContainer } from '../runtime/registry';

// Older preludes do not store routing metadata. Capture their bundle's configuration
// while its globals prelude is active, before another bundle can replace it.
const legacyAppConfig = readLegacyAppConfig();

export function getRouteAppConfig(): PendingHostComponentAppConfig | null {
  const appName = findCurrentAppName();
  if (appName == null) {
    const legacyContainer = legacyAppConfig == null ? null : getContainer(legacyAppConfig.name);
    return typeof legacyContainer?.config.scheme === 'string' ? null : legacyAppConfig;
  }

  const container = getContainer(appName);
  if (
    container != null &&
    typeof container.config.scheme === 'string' &&
    (container.config.host == null || typeof container.config.host === 'string')
  ) {
    return { name: appName, scheme: container.config.scheme, host: container.config.host };
  }

  return legacyAppConfig?.name === appName ? legacyAppConfig : null;
}

function readLegacyAppConfig(): PendingHostComponentAppConfig | null {
  const granite: unknown = Reflect.get(globalThis, '__granite');
  if (!isPropertyMap(granite) || !isPropertyMap(granite['app'])) {
    return null;
  }
  const { name, scheme, host } = granite['app'];
  if (typeof name !== 'string' || typeof scheme !== 'string' || typeof host !== 'string') {
    return null;
  }
  return { name, scheme, host };
}

function isPropertyMap(value: unknown): value is Readonly<Record<PropertyKey, unknown>> {
  return typeof value === 'object' && value !== null;
}
