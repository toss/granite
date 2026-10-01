import { InvalidRequest } from './errors/InvalidRequest';
import type { S3Client } from './s3/client';

export interface DeploymentContext {
  s3Client: S3Client;
  /** Omit to use the existing, unscoped deployment namespace. */
  channel?: string;
}

/** Channel names are case-sensitive URL segments and are never normalized. */
export function validateChannel(channel: string): string {
  if (channel === 'bundle') {
    throw new InvalidRequest('bundle is reserved for the legacy default bundle');
  }
  if (!isChannelName(channel)) {
    throw new InvalidRequest(
      'Channel must contain 1-64 letters, digits, underscores or hyphens, starting with a letter or digit'
    );
  }
  return channel;
}

export function isChannelName(value: unknown): value is string {
  return typeof value === 'string' && value !== 'bundle' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(value);
}

export function channelPrefix(channel?: string): string {
  return channel === undefined ? '' : `channels/${validateChannel(channel)}/`;
}
