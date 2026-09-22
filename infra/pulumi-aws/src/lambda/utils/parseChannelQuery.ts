import { InvalidRequest, validateChannel } from '@granite-js/deployment-manager';

/** Keep the existing bundle path and filename tag independent of the channel. */
export function parseChannelQuery(querystring: string): { channel?: string; querystring: string } {
  const params = new URLSearchParams(querystring);
  const channels = params.getAll('channel');
  if (channels.length === 0) {
    return { querystring };
  }
  if (channels.length !== 1) {
    throw new InvalidRequest('Specify exactly one channel query parameter');
  }

  const channel = validateChannel(channels[0]!);
  // CloudFront has already selected the viewer cache key. The channel selects
  // the S3 key and must not become an S3 query parameter.
  params.delete('channel');
  return { channel, querystring: params.toString() };
}
