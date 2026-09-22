import { InvalidRequest, validateChannel } from '@granite-js/deployment-manager';

/** App names mapped to channel names reserved as short bundle URL selectors. */
export type PathChannelRoutes = Record<string, readonly string[]>;

export function parsePathChannelRoutes(routes: PathChannelRoutes = {}): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const [appName, channels] of Object.entries(routes)) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(appName) || !Array.isArray(channels)) {
      throw new InvalidRequest('pathChannelRoutes must map URL-safe application names to channel arrays');
    }
    const names = new Set<string>();
    for (const channel of channels) {
      validateChannel(channel);
      if (channel === 'bundle') {
        throw new InvalidRequest('bundle is reserved for the legacy default bundle');
      }
      if (names.has(channel)) {
        throw new InvalidRequest(`Duplicate path channel for ${appName}: ${channel}`);
      }
      names.add(channel);
    }
    result.set(appName, names);
  }
  return result;
}
