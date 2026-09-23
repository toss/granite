import { NoSuchKey, S3ServiceException } from '@aws-sdk/client-s3';
import { literal, object, parse, union, type InferOutput } from 'valibot';
import { isChannelName, validateChannel } from './channel';
import { InternalServerError, InvalidRequest } from './errors';
import { paths, type S3Client } from './s3';

const registrationSchema = object({
  version: literal(1),
  type: union([literal('CHANNEL'), literal('LEGACY_TAG')]),
});
type Registration = InferOutput<typeof registrationSchema>;
interface SelectorOptions {
  appName: string;
  selector: string;
}
interface StorageContext {
  s3Client: S3Client;
}

function isAppName(appName: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(appName);
}

/** A missing record is legacy; storage failures or corrupt records must not become legacy routes. */
async function readRegistration(
  options: SelectorOptions,
  { s3Client }: StorageContext
): Promise<Registration | undefined> {
  let raw: string;
  try {
    raw = await s3Client.getObject(paths.selectorRegistration(options));
  } catch (error) {
    if (error instanceof NoSuchKey) {
      return undefined;
    }
    throw error;
  }
  try {
    return parse(registrationSchema, JSON.parse(raw));
  } catch (error) {
    throw new InternalServerError('Invalid selector registration', error);
  }
}

export async function resolveChannel(options: SelectorOptions, context: StorageContext): Promise<string | undefined> {
  if (!isAppName(options.appName) || !isChannelName(options.selector)) {
    return undefined;
  }
  const registration = await readRegistration(options, context);
  return registration?.type === 'CHANNEL' ? options.selector : undefined;
}

export async function registerChannel(
  { appName, channel }: { appName: string; channel: string },
  context: StorageContext
): Promise<void> {
  validateChannel(channel);
  if (!isAppName(appName)) {
    throw new InvalidRequest('Channel registration requires a URL-safe application name');
  }
  await claimSelector({ appName, selector: channel }, 'CHANNEL', context);
}

/** Reserve URL-safe legacy tags before upload so concurrent channel creation cannot claim the same name. */
export async function reserveLegacyTag(options: SelectorOptions, context: StorageContext): Promise<void> {
  if (isAppName(options.appName) && isChannelName(options.selector)) {
    await claimSelector(options, 'LEGACY_TAG', context);
  }
}

async function claimSelector(
  options: SelectorOptions,
  type: Registration['type'],
  context: StorageContext
): Promise<void> {
  const { s3Client } = context;
  let lastConflict: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await readRegistration(options, context);
    if (existing !== undefined) {
      if (existing.type !== type) {
        throw new InvalidRequest(
          `Selector ${options.selector} for ${options.appName} is already reserved as ${existing.type}`
        );
      }
      return;
    }

    if (type === 'CHANNEL') {
      // Include historical objects: old clients can still hold a legacy tag URL.
      const prefix = paths.appBundlePrefix({ appName: options.appName });
      for await (const key of s3Client.listObjectKeys(prefix)) {
        if (['ios', 'android'].some((platform) => key.endsWith(`/bundle.${platform}.${options.selector}.hbc.gz`))) {
          throw new InvalidRequest(
            `Channel ${options.selector} conflicts with an existing legacy bundle tag for ${options.appName}`
          );
        }
      }
    }

    try {
      await s3Client.putObject(paths.selectorRegistration(options), {
        Body: JSON.stringify({ version: 1, type } satisfies Registration),
        ContentType: 'application/json',
        CacheControl: 'no-store',
        IfNoneMatch: '*',
      });
      return;
    } catch (error) {
      if (!(error instanceof S3ServiceException) || ![409, 412].includes(error.$metadata.httpStatusCode ?? 0)) {
        throw error;
      }
      lastConflict = error;
    }
  }
  throw new InternalServerError('Concurrent selector registration could not be completed', lastConflict);
}
