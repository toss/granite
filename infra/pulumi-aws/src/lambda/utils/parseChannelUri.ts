import { InvalidRequest, validateChannel } from '@granite-js/deployment-manager';

/** Strip the optional channel prefix before parsing the existing bundle route. */
export function parseChannelUri(uri: string): { channel?: string; uri: string } {
  const parts = uri.split('/');
  if (parts[1] !== 'channels') {
    return { uri };
  }

  const channel = validateChannel(parts[2] ?? '');
  if (parts.length !== 7 || !['ios', 'android'].includes(parts[3] ?? '') || parts.slice(4).some((part) => !part)) {
    throw new InvalidRequest('Expected /channels/<channel>/<platform>/<app>/<group>/<suffix>');
  }
  return { channel, uri: `/${parts.slice(3).join('/')}` };
}
