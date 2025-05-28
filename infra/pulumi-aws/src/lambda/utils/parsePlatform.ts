import { InvalidRequest } from '@granite-js/deployment-manager';

export function parsePlatform(uri: string) {
  if (uri.startsWith('/ios')) {
    return 'ios';
  }
  if (uri.startsWith('/android')) {
    return 'android';
  }

  throw new InvalidRequest(`URI must start with /ios or /android. uri: ${uri}`);
}
