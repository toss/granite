import {
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client as BaseS3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeployManager } from './DeployManager';
import { S3Client, paths } from './s3';
import { reserveLegacyTag } from './selectorRegistration';

describe('S3 selector registrations', () => {
  const mock = mockClient(BaseS3Client);
  const s3Client = new S3Client({ bucket: 'sample-bucket' });
  const context = { s3Client };
  const appName = 'sample-app';
  const objects = new Map<string, string>();
  const routeKey = (selector: string) => paths.selectorRegistration({ appName, selector });

  beforeEach(() => {
    objects.clear();
    mock.on(GetObjectCommand).callsFake(({ Key }) => {
      const body = objects.get(Key);
      if (body === undefined) {
        throw new NoSuchKey({ $metadata: {}, message: 'Not found' });
      }
      return { Body: { transformToString: async () => body } };
    });
    mock.on(ListObjectsV2Command).callsFake(({ Prefix }) => ({
      Contents: [...objects.keys()].filter((key) => key.startsWith(Prefix)).map((Key) => ({ Key })),
    }));
    mock.on(PutObjectCommand).callsFake(({ Key, Body, IfNoneMatch }) => {
      if (IfNoneMatch === '*' && objects.has(Key)) {
        throw new S3ServiceException({
          name: 'PreconditionFailed',
          $fault: 'client',
          $metadata: { httpStatusCode: 412 },
        });
      }
      objects.set(Key, Body);
      return {};
    });
  });
  afterEach(() => mock.reset());

  it('claims a channel once without a shared mutable channel list', async () => {
    await Promise.all(
      ['next', 'stable'].map((channel) => DeployManager.registerChannel({ appName, channel }, context))
    );
    await DeployManager.registerChannel({ appName, channel: 'next' }, context);
    expect(objects.get(routeKey('next'))).toBe(JSON.stringify({ version: 1, type: 'CHANNEL' }));
    expect(objects.get(routeKey('stable'))).toBe(JSON.stringify({ version: 1, type: 'CHANNEL' }));
    expect(mock.commandCalls(PutObjectCommand)).toHaveLength(2);
    for (const call of mock.commandCalls(PutObjectCommand)) {
      expect(call.args[0].input.IfNoneMatch).toBe('*');
    }
    expect(await DeployManager.resolveChannel({ appName, selector: 'next' }, context)).toBe('next');
    expect(await DeployManager.resolveChannel({ appName: 'another-app', selector: 'next' }, context)).toBeUndefined();
  });

  it('keeps a registered channel selected before it has any deployment state', async () => {
    await DeployManager.registerChannel({ appName, channel: 'next' }, context);
    expect(await DeployManager.resolveChannel({ appName, selector: 'next' }, context)).toBe('next');
    await expect(DeployManager.readDeploymentState(appName, { ...context, channel: 'next' })).rejects.toBeInstanceOf(
      NoSuchKey
    );
  });

  it.each(['ios', 'android'])('rejects a retained historical %s tag before claiming a channel', async (platform) => {
    objects.set(`bundles/${appName}/old-release/bundle.${platform}.next.hbc.gz`, 'old bytes');
    await expect(DeployManager.registerChannel({ appName, channel: 'next' }, context)).rejects.toThrow(
      'existing legacy bundle tag'
    );
    expect(objects.has(routeKey('next'))).toBe(false);
    expect(mock.commandCalls(PutObjectCommand)).toHaveLength(0);
  });

  it('checks all S3 listing pages for old tags', async () => {
    mock.on(ListObjectsV2Command).callsFake(({ ContinuationToken }) =>
      ContinuationToken === undefined
        ? {
            Contents: [{ Key: `bundles/${appName}/release-a/bundle.ios.hbc.gz` }],
            IsTruncated: true,
            NextContinuationToken: 'page-2',
          }
        : { Contents: [{ Key: `bundles/${appName}/release-b/bundle.android.next.hbc.gz` }], IsTruncated: false }
    );
    await expect(DeployManager.registerChannel({ appName, channel: 'next' }, context)).rejects.toThrow(
      'existing legacy bundle tag'
    );
    expect(mock.commandCalls(ListObjectsV2Command)).toHaveLength(2);
    expect(mock.commandCalls(ListObjectsV2Command)[1]!.args[0].input.ContinuationToken).toBe('page-2');
    expect(mock.commandCalls(PutObjectCommand)).toHaveLength(0);
  });

  it('fails closed when the legacy listing is unavailable or incomplete', async () => {
    mock.on(ListObjectsV2Command).rejects(new Error('AccessDenied'));
    await expect(DeployManager.registerChannel({ appName, channel: 'next' }, context)).rejects.toThrow('AccessDenied');
    mock.on(ListObjectsV2Command).resolves({ IsTruncated: true });
    await expect(DeployManager.registerChannel({ appName, channel: 'next' }, context)).rejects.toThrow(
      'continuation token'
    );
    expect(mock.commandCalls(PutObjectCommand)).toHaveLength(0);
  });

  it('reserves legacy tags and refuses a channel with the same name', async () => {
    await reserveLegacyTag({ appName, selector: 'custom-tag' }, context);
    await expect(DeployManager.registerChannel({ appName, channel: 'custom-tag' }, context)).rejects.toThrow(
      'LEGACY_TAG'
    );
    expect(await DeployManager.resolveChannel({ appName, selector: 'custom-tag' }, context)).toBeUndefined();
  });

  it('prevents new legacy tag uploads from taking over a channel name', async () => {
    await DeployManager.registerChannel({ appName, channel: 'next' }, context);
    await expect(
      DeployManager.uploadBundle(
        {
          appName,
          tag: 'next',
          platform: 'ios',
          deploymentId: 'release',
          deployedAt: new Date(0),
          bundlePath: 'unused.hbc.gz',
        },
        context
      )
    ).rejects.toThrow('CHANNEL');
    expect([...objects.keys()]).toEqual([routeKey('next')]);
  });

  it('allows exactly one owner when a channel and legacy tag race for a name', async () => {
    const outcomes = await Promise.allSettled([
      DeployManager.registerChannel({ appName, channel: 'next' }, context),
      reserveLegacyTag({ appName, selector: 'next' }, context),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
    const type = outcomes[0]!.status === 'fulfilled' ? 'CHANNEL' : 'LEGACY_TAG';
    expect(JSON.parse(objects.get(routeKey('next'))!)).toEqual({ version: 1, type });
    expect(objects.size).toBe(1);
  });

  it('accepts simultaneous registrations of the same channel', async () => {
    await Promise.all([
      DeployManager.registerChannel({ appName, channel: 'next' }, context),
      DeployManager.registerChannel({ appName, channel: 'next' }, context),
    ]);
    expect(objects.size).toBe(1);
    expect(await DeployManager.resolveChannel({ appName, selector: 'next' }, context)).toBe('next');
  });

  it.each([409, 412])('retries conditional write conflict %s', async (httpStatusCode) => {
    mock
      .on(PutObjectCommand)
      .rejectsOnce(new S3ServiceException({ name: 'Conflict', $fault: 'client', $metadata: { httpStatusCode } }))
      .callsFake(({ Key, Body }) => {
        objects.set(Key, Body);
        return {};
      });
    await DeployManager.registerChannel({ appName, channel: 'next' }, context);
    expect(await DeployManager.resolveChannel({ appName, selector: 'next' }, context)).toBe('next');
  });

  it('does not interpret registry errors or corruption as a legacy route', async () => {
    objects.set(routeKey('next'), '{');
    await expect(DeployManager.resolveChannel({ appName, selector: 'next' }, context)).rejects.toThrow(
      'Invalid selector registration'
    );
    objects.set(routeKey('next'), JSON.stringify({ version: 2, type: 'CHANNEL' }));
    await expect(DeployManager.resolveChannel({ appName, selector: 'next' }, context)).rejects.toThrow(
      'Invalid selector registration'
    );
    mock.on(GetObjectCommand).rejects(new Error('AccessDenied'));
    await expect(DeployManager.resolveChannel({ appName, selector: 'next' }, context)).rejects.toThrow('AccessDenied');
  });

  it('leaves the reserved default and non-channel legacy tags alone', async () => {
    for (const selector of ['bundle', 'custom@tag']) {
      expect(await DeployManager.resolveChannel({ appName, selector }, context)).toBeUndefined();
    }
    await expect(DeployManager.registerChannel({ appName, channel: 'bundle' }, context)).rejects.toThrow('reserved');
    expect(mock.calls()).toHaveLength(0);
  });

  it('rejects invalid app registration names before accessing S3', async () => {
    await expect(
      DeployManager.registerChannel({ appName: '../another-app', channel: 'next' }, context)
    ).rejects.toThrow('URL-safe application name');
    expect(mock.calls()).toHaveLength(0);
  });
});
