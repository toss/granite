import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { gunzipSync, gzipSync } from 'node:zlib';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { DeployManager, NoSuchKey, S3Client, S3ServiceException } from '@granite-js/deployment-manager';
import type { Callback, CloudFrontRequestEvent, CloudFrontResponse, Context, S3EventRecord } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { handler as originResponse } from './origin-response';

// Run the real deployment manager and Lambda handlers. Only storage and the
// CloudFront API are replaced; this cache model does not emulate AWS timing/IAM.
const objects = new Map<string, { body: Buffer; metadata?: Record<string, string> }>();
const notifications: S3EventRecord[] = [];
const reads: string[] = [];
const readFailures = new Map<string, Error>();
const writeFailures = new Set<string>();
const cloudfront = mockClient(CloudFrontClient);
const cache = new Map<string, { status: string; body?: string; headers?: CloudFrontResponse['headers'] }>();
const s3Client = new S3Client({ bucket: 'sample-bucket', region: 'us-east-1' });
let directory: string;
let originRequest: typeof import('./origin-request').handler;
let invalidate: typeof import('./auto-cache-removal').handler;

function requestEvent(uri: string): CloudFrontRequestEvent {
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: 'cdn.example.com',
            distributionId: 'sample',
            eventType: 'origin-request',
            requestId: 'request',
          },
          request: { uri, method: 'GET', clientIp: '127.0.0.1', querystring: '', headers: {} },
        },
      },
    ],
  };
}

function record(key: string, eventName = 'ObjectCreated:Put'): S3EventRecord {
  return {
    eventName,
    s3: { bucket: { name: 'sample-bucket' }, object: { key: encodeURIComponent(key) } },
  } as S3EventRecord;
}

async function fetchBundle(uri: string) {
  const cached = cache.get(uri);
  if (cached) {
    return cached;
  }
  const event = requestEvent(uri);
  const request = await originRequest(event);
  if (!request) {
    throw new Error('Expected a request or response');
  }
  if ('status' in request) {
    const result = { status: request.status };
    cache.set(uri, result);
    return result;
  }
  const object = objects.get(request.uri.slice(1));
  if (!object) {
    return { status: '404' };
  }
  const response = await originResponse({
    Records: [
      {
        cf: {
          config: { ...event.Records[0]!.cf.config, eventType: 'origin-response' },
          request,
          response: {
            status: '200',
            statusDescription: 'OK',
            headers: Object.fromEntries(
              Object.entries(object.metadata ?? {}).map(([key, value]) => [
                `x-amz-meta-${key.toLowerCase()}`,
                [{ key: `x-amz-meta-${key.toLowerCase()}`, value }],
              ])
            ),
          },
        },
      },
    ],
  });
  if (!response) {
    throw new Error('Expected an origin response');
  }
  const result = { status: response.status, body: gunzipSync(object.body).toString(), headers: response.headers };
  cache.set(uri, result);
  return result;
}

async function deliverNotifications(records = notifications.splice(0)) {
  const callback = vi.fn<Callback>();
  await invalidate({ Records: records }, {} as Context, callback);
  expect(callback).toHaveBeenCalledExactlyOnceWith(
    null,
    expect.objectContaining({
      message: 'Successfully processed all records',
    })
  );
}

// Explicitly complete the requested invalidations; AWS does this asynchronously.
function completeInvalidations() {
  for (const call of cloudfront.commandCalls(CreateInvalidationCommand)) {
    for (const path of call.args[0].input.InvalidationBatch?.Paths?.Items ?? []) {
      expect(path).toMatch(/\/\*$/);
      for (const uri of cache.keys()) {
        if (uri.startsWith(path.slice(0, -1))) {
          cache.delete(uri);
        }
      }
    }
  }
  cloudfront.resetHistory();
}

async function upload(appName: string, deploymentId: string, channel?: string, tag?: string) {
  for (const platform of ['ios', 'android'] as const) {
    const bundlePath = join(directory, `bundle.${platform}.hbc.gz`);
    await writeFile(bundlePath, gzipSync(`${appName}:${channel ?? 'legacy'}:${deploymentId}:${platform}`));
    await DeployManager.uploadBundle(
      { appName, deploymentId, platform, tag, bundlePath, deployedAt: new Date(0) },
      { s3Client, channel }
    );
  }
}

async function publish(appName: string, deploymentId: string, channel?: string, tag?: string) {
  await upload(appName, deploymentId, channel, tag);
  await DeployManager.updateBundleList(
    { appName, newDeploymentInfo: { deploymentId, deployedAt: 0 } },
    { s3Client, channel }
  );
  await DeployManager.rollout({ appName, state: { type: 'STABLE', deploymentId } }, { s3Client, channel });
}

beforeAll(async () => {
  vi.stubGlobal('_BUCKET_NAME', 'sample-bucket');
  vi.stubGlobal('_BUCKET_REGION', 'us-east-1');
  vi.stubEnv('CLOUDFRONT_DISTRIBUTION_ID', 'sample-distribution');
  ({ handler: originRequest } = await import('./origin-request'));
  ({ handler: invalidate } = await import('./auto-cache-removal'));
});

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'lambda-channels-'));
  objects.clear();
  notifications.length = 0;
  reads.length = 0;
  readFailures.clear();
  writeFailures.clear();
  cache.clear();
  cloudfront.reset();
  cloudfront.rejects(new Error('Unexpected CloudFront command'));
  cloudfront
    .on(CreateInvalidationCommand)
    .resolves({ Invalidation: { Id: 'sample-invalidation', Status: 'InProgress' } });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(S3Client.prototype, 'getObject').mockImplementation(async (key) => {
    reads.push(key);
    if (readFailures.has(key)) {
      throw readFailures.get(key);
    }
    const object = objects.get(key);
    if (!object) {
      throw new NoSuchKey({ $metadata: {}, message: 'Not found' });
    }
    return object.body.toString();
  });
  vi.spyOn(S3Client.prototype, 'putObject').mockImplementation(async (key, input) => {
    const body =
      input.Body instanceof Readable ? Buffer.concat(await input.Body.toArray()) : Buffer.from(input.Body as string);
    if (writeFailures.has(key)) {
      throw new Error('Simulated upload failure');
    }
    if (input.IfNoneMatch === '*' && objects.has(key)) {
      throw new S3ServiceException({
        name: 'PreconditionFailed',
        $fault: 'client',
        $metadata: { httpStatusCode: 412 },
      });
    }
    objects.set(key, { body, metadata: input.Metadata });
    notifications.push(record(key));
    return { $metadata: {} };
  });
  vi.spyOn(S3Client.prototype, 'listObjectKeys').mockImplementation(async function* (prefix) {
    yield* [...objects.keys()].filter((key) => key.startsWith(prefix));
  });
  vi.spyOn(S3Client.prototype, 'headObject').mockRejectedValue(new Error('Unexpected S3 HEAD'));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});
afterAll(() => {
  cloudfront.restore();
  s3Client.destroy();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('offline channel lifecycle through Lambda', () => {
  it.each(['sample-app', 'shared'])(
    'serves uploaded bytes and metadata for %s on both platforms and all namespaces',
    async (appName) => {
      for (const channel of [undefined, 'next', 'stable']) {
        await publish(appName, 'release', channel);
      }
      for (const channel of [undefined, 'next', 'stable']) {
        for (const platform of ['ios', 'android']) {
          expect(await fetchBundle(`/${platform}/${appName}/1/${channel ?? 'bundle'}`)).toMatchObject({
            status: '200',
            body: `${appName}:${channel ?? 'legacy'}:release:${platform}`,
            headers: { 'x-deployment-id': [{ key: 'X-Deployment-Id', value: 'release' }] },
          });
        }
      }
    }
  );

  it('removes cached missing-channel responses at registration and again after rollout', async () => {
    const uri = '/ios/sample-app/1/next';
    expect(await fetchBundle(uri)).toEqual({ status: '404' });
    await DeployManager.registerChannel({ appName: 'sample-app', channel: 'next' }, { s3Client });
    await deliverNotifications();
    expect(cloudfront.commandCalls(CreateInvalidationCommand)).toHaveLength(1);
    completeInvalidations();
    expect(cache.has(uri)).toBe(false);
    expect(await fetchBundle(uri)).toEqual({ status: '404' });
    await publish('sample-app', 'release', 'next');
    await deliverNotifications();
    expect(cloudfront.commandCalls(CreateInvalidationCommand)).toHaveLength(1);
    expect(await fetchBundle(uri)).toEqual({ status: '404' });
    completeInvalidations();
    expect(await fetchBundle(uri)).toMatchObject({ body: 'sample-app:next:release:ios' });
  });

  it('keeps the previous rollout until promotion and invalidates only the affected app', async () => {
    await publish('sample-app', 'old', 'next');
    await publish('sample-app', 'stable-release', 'stable');
    await publish('another-app', 'other-release', 'next');
    await deliverNotifications();
    completeInvalidations();
    const uri = '/ios/sample-app/1/next';
    const stableUri = '/android/sample-app/1/stable';
    const otherUri = '/ios/another-app/1/next';
    await Promise.all([uri, stableUri, otherUri].map(fetchBundle));
    await upload('sample-app', 'new', 'next');
    await deliverNotifications();
    expect(cloudfront.calls()).toHaveLength(0);
    expect(await originRequest(requestEvent(uri))).toMatchObject({
      uri: '/channels/next/bundles/sample-app/old/bundle.ios.hbc.gz',
    });
    await DeployManager.rollout(
      { appName: 'sample-app', state: { type: 'STABLE', deploymentId: 'new' } },
      { s3Client, channel: 'next' }
    );
    await deliverNotifications();
    expect(cloudfront.commandCalls(CreateInvalidationCommand)[0]!.args[0].input).toMatchObject({
      DistributionId: 'sample-distribution',
      InvalidationBatch: { Paths: { Quantity: 2, Items: ['/ios/sample-app/*', '/android/sample-app/*'] } },
    });
    expect(await fetchBundle(uri)).toMatchObject({ body: 'sample-app:next:old:ios' });
    completeInvalidations();
    expect(cache.has(uri)).toBe(false);
    expect(cache.has(stableUri)).toBe(false);
    expect(cache.has(otherUri)).toBe(true);
    expect(await fetchBundle(uri)).toMatchObject({ body: 'sample-app:next:new:ios' });
    expect(await fetchBundle(stableUri)).toMatchObject({ body: 'sample-app:stable:stable-release:android' });
  });

  it.each([0, 1, 50, 99, 100])('routes all 1000 groups at %i percent without crossing channels', async (progress) => {
    const context = { s3Client, channel: 'next' };
    await publish('sample-app', 'old', 'next');
    await upload('sample-app', 'new', 'next');
    await publish('sample-app', 'stable-release', 'stable');
    const current = await DeployManager.readDeploymentState('sample-app', context);
    const canary = await DeployManager.planRollout(current, { targetDeploymentId: 'new', progress: 50 });
    const state = await DeployManager.planRollout(canary, { targetDeploymentId: 'new', progress });
    await DeployManager.rollout({ appName: 'sample-app', state }, context);
    let targetCount = 0;
    for (let group = 1; group <= 1000; group++) {
      let iosDeployment: string | undefined;
      for (const platform of ['ios', 'android']) {
        const result = await originRequest(requestEvent(`/${platform}/sample-app/${group}/next`));
        if (!result || !('uri' in result)) {
          throw new Error(`Expected a bundle request for group ${group}`);
        }
        const target = `/channels/next/bundles/sample-app/new/bundle.${platform}.hbc.gz`;
        expect([target, `/channels/next/bundles/sample-app/old/bundle.${platform}.hbc.gz`]).toContain(result.uri);
        const selected = result.uri === target ? 'new' : 'old';
        if (platform === 'ios') {
          iosDeployment = selected;
          targetCount += selected === 'new' ? 1 : 0;
        } else {
          expect(selected).toBe(iosDeployment);
        }
      }
    }
    expect(targetCount).toBe(progress * 10);
    expect(await fetchBundle('/ios/sample-app/1/stable')).toMatchObject({
      body: 'sample-app:stable:stable-release:ios',
    });
  });

  it('keeps legacy tagged bytes and prevents channel registration from taking over their URL', async () => {
    await publish('sample-app', 'legacy-release', undefined, 'custom-tag');
    const uri = '/ios/sample-app/1/custom-tag';
    expect(await fetchBundle(uri)).toMatchObject({ body: 'sample-app:legacy:legacy-release:ios' });
    await expect(
      DeployManager.registerChannel({ appName: 'sample-app', channel: 'custom-tag' }, { s3Client })
    ).rejects.toThrow('LEGACY_TAG');
    expect(await originRequest(requestEvent(uri))).toMatchObject({
      uri: '/bundles/sample-app/legacy-release/bundle.ios.custom-tag.hbc.gz',
    });
  });

  it('keeps a failed first publication registered, returns 404, and allows a successful retry', async () => {
    await publish('sample-app', 'legacy-release');
    const failedKey = 'channels/next/bundles/sample-app/release/bundle.android.hbc.gz';
    writeFailures.add(failedKey);
    await expect(publish('sample-app', 'release', 'next')).rejects.toThrow('Simulated upload failure');
    expect(objects.has('deployments/sample-app/selectors/next.json')).toBe(true);
    expect(objects.has('channels/next/deployments/sample-app/deployment_state')).toBe(false);
    expect(objects.has('channels/next/deployments/sample-app/DEPLOYMENTS')).toBe(false);
    for (const platform of ['ios', 'android']) {
      expect(await originRequest(requestEvent(`/${platform}/sample-app/1/next`))).toMatchObject({ status: '404' });
    }
    writeFailures.clear();
    await publish('sample-app', 'release', 'next');
    expect(await fetchBundle('/android/sample-app/1/next')).toMatchObject({ body: 'sample-app:next:release:android' });
  });

  it('returns 404 after channel state is removed and never falls back to a legacy deployment', async () => {
    await publish('sample-app', 'legacy-release');
    await publish('sample-app', 'release', 'next');
    await deliverNotifications();
    completeInvalidations();
    const uri = '/ios/sample-app/1/next';
    await fetchBundle(uri);
    const key = 'channels/next/deployments/sample-app/deployment_state';
    objects.delete(key);
    await deliverNotifications([record(key, 'ObjectRemoved:Delete')]);
    completeInvalidations();
    reads.length = 0;
    expect(await fetchBundle(uri)).toEqual({ status: '404' });
    expect(reads).not.toContain('deployments/sample-app/deployment_state');
    expect(objects.has('deployments/sample-app/selectors/next.json')).toBe(true);
  });

  it.each(['ios', 'android'])(
    'keeps both platforms on the previous deployment after a %s upload failure',
    async (platform) => {
      await publish('sample-app', 'old', 'next');
      await deliverNotifications();
      completeInvalidations();
      writeFailures.add(`channels/next/bundles/sample-app/new/bundle.${platform}.hbc.gz`);
      await expect(publish('sample-app', 'new', 'next')).rejects.toThrow('Simulated upload failure');
      await deliverNotifications();
      expect(cloudfront.calls()).toHaveLength(0);
      for (const target of ['ios', 'android']) {
        expect(await fetchBundle(`/${target}/sample-app/1/next`)).toMatchObject({
          body: `sample-app:next:old:${target}`,
        });
      }
      expect(await DeployManager.readBundleList('sample-app', { s3Client, channel: 'next' })).toEqual([
        { deploymentId: 'old', deployedAt: 0 },
      ]);
    }
  );

  it('does not recover a missing channel artifact from the legacy namespace', async () => {
    await publish('sample-app', 'release');
    await publish('sample-app', 'release', 'next');
    objects.delete('channels/next/bundles/sample-app/release/bundle.ios.hbc.gz');
    expect(await originRequest(requestEvent('/ios/sample-app/1/next'))).toMatchObject({
      uri: '/channels/next/bundles/sample-app/release/bundle.ios.hbc.gz',
    });
    expect(await fetchBundle('/ios/sample-app/1/next')).toEqual({ status: '404' });
    expect(await fetchBundle('/ios/sample-app/1/bundle')).toMatchObject({
      status: '200',
      body: 'sample-app:legacy:release:ios',
    });
  });

  it.each(['{', '{"type":"UNKNOWN"}', '{"type":"STABLE"}'])(
    'fails closed for corrupt channel state %s',
    async (body) => {
      await publish('sample-app', 'legacy-release');
      await DeployManager.registerChannel({ appName: 'sample-app', channel: 'next' }, { s3Client });
      objects.set('channels/next/deployments/sample-app/deployment_state', { body: Buffer.from(body) });
      reads.length = 0;
      await expect(originRequest(requestEvent('/ios/sample-app/1/next'))).rejects.toThrow();
      expect(reads).not.toContain('deployments/sample-app/deployment_state');
    }
  );

  it('propagates channel state access failures and treats pending state as unavailable', async () => {
    await DeployManager.rollout({ appName: 'sample-app', state: { type: 'PENDING' } }, { s3Client, channel: 'next' });
    expect(await originRequest(requestEvent('/ios/sample-app/1/next'))).toMatchObject({ status: '404' });
    readFailures.set('channels/next/deployments/sample-app/deployment_state', new Error('AccessDenied'));
    await expect(originRequest(requestEvent('/ios/sample-app/1/next'))).rejects.toThrow('AccessDenied');
  });
});
