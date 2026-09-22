import { DeployManager, NoSuchKey, S3Client } from '@granite-js/deployment-manager';
import type { CloudFrontRequestEvent } from 'aws-lambda';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let createOriginRequestHandler: typeof import('./origin-request').createOriginRequestHandler;
let configuredHandler: typeof import('./origin-request').handler;
const context = { bucketName: 'sample-bucket', region: 'us-east-1', allowAccessCluster: true };
const objects = new Map<string, string>();
const reads: string[] = [];

function event(uri: string, querystring = ''): CloudFrontRequestEvent {
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
          request: { uri, method: 'GET', clientIp: '127.0.0.1', querystring, headers: {} },
        },
      },
    ],
  };
}

function register(appName: string, selector: string, type = 'CHANNEL') {
  objects.set(`deployments/${appName}/selectors/${selector}.json`, JSON.stringify({ version: 1, type }));
}

function state(appName: string, deploymentId: string, channel?: string) {
  const prefix = channel ? `channels/${channel}/` : '';
  objects.set(`${prefix}deployments/${appName}/deployment_state`, JSON.stringify({ type: 'STABLE', deploymentId }));
}

beforeAll(async () => {
  vi.stubGlobal('_BUCKET_NAME', context.bucketName);
  vi.stubGlobal('_BUCKET_REGION', context.region);
  ({ createOriginRequestHandler, handler: configuredHandler } = await import('./origin-request'));
});
beforeEach(() => {
  objects.clear();
  reads.length = 0;
  vi.spyOn(S3Client.prototype, 'getObject').mockImplementation(async (key) => {
    reads.push(key);
    const body = objects.get(key);
    if (body === undefined) {
      throw new NoSuchKey({ $metadata: {}, message: 'Not found' });
    }
    return body;
  });
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => vi.unstubAllGlobals());

describe('S3-registered channel routing', () => {
  it.each(['ios', 'android'])('resolves app and shared channels on %s', async (platform) => {
    const handler = createOriginRequestHandler(context);
    for (const appName of ['sample-app', 'shared']) {
      register(appName, 'next');
      state(appName, 'release', 'next');
      expect(await handler(event(`/${platform}/${appName}/1/next`))).toEqual(
        expect.objectContaining({
          uri: `/channels/next/bundles/${appName}/release/bundle.${platform}.hbc.gz`,
        })
      );
    }
    expect(reads).toEqual([
      'deployments/sample-app/selectors/next.json',
      'channels/next/deployments/sample-app/deployment_state',
      'deployments/shared/selectors/next.json',
      'channels/next/deployments/shared/deployment_state',
    ]);
  });

  it('the same exported Lambda discovers new registrations without configuration changes', async () => {
    state('sample-app', 'legacy');
    expect(await configuredHandler(event('/ios/sample-app/1/next'))).toMatchObject({
      uri: '/bundles/sample-app/legacy/bundle.ios.next.hbc.gz',
    });
    register('sample-app', 'next');
    expect(await configuredHandler(event('/ios/sample-app/1/next'))).toMatchObject({ status: '404' });
    state('sample-app', 'release', 'next');
    expect(await configuredHandler(event('/ios/sample-app/1/next'))).toMatchObject({
      uri: '/channels/next/bundles/sample-app/release/bundle.ios.hbc.gz',
    });
  });

  it('keeps registrations scoped to each app', async () => {
    register('sample-app', 'next');
    state('another-app', 'legacy');
    expect(await createOriginRequestHandler(context)(event('/ios/another-app/1/next'))).toMatchObject({
      uri: '/bundles/another-app/legacy/bundle.ios.next.hbc.gz',
    });
    expect(reads).toEqual(['deployments/another-app/selectors/next.json', 'deployments/another-app/deployment_state']);
  });

  it.each(['custom-tag', 'custom@tag', 'channels', 'next'])('keeps unregistered legacy tag %s', async (tag) => {
    state('sample-app', 'legacy');
    expect(await createOriginRequestHandler(context)(event(`/ios/sample-app/1/${tag}`))).toMatchObject({
      uri: `/bundles/sample-app/legacy/bundle.ios.${tag}.hbc.gz`,
    });
    expect(reads.at(-1)).toBe('deployments/sample-app/deployment_state');
  });

  it('keeps reserved legacy tag registrations out of channel routing', async () => {
    register('sample-app', 'custom-tag', 'LEGACY_TAG');
    state('sample-app', 'legacy');
    state('sample-app', 'orphaned-channel', 'custom-tag');
    expect(await createOriginRequestHandler(context)(event('/ios/sample-app/1/custom-tag'))).toMatchObject({
      uri: '/bundles/sample-app/legacy/bundle.ios.custom-tag.hbc.gz',
    });
  });

  it('keeps bundle in the legacy namespace without a registration lookup', async () => {
    state('sample-app', 'legacy');
    expect(await configuredHandler(event('/ios/sample-app/1/bundle'))).toMatchObject({
      uri: '/bundles/sample-app/legacy/bundle.ios.hbc.gz',
    });
    expect(reads).toEqual(['deployments/sample-app/deployment_state']);
  });

  it('selects separate deployment state and artifacts for the same app in two channels', async () => {
    const handler = createOriginRequestHandler(context);
    for (const channel of ['next', 'stable']) {
      register('sample-app', channel);
      state('sample-app', `${channel}-release`, channel);
    }
    for (const channel of ['next', 'stable']) {
      for (const platform of ['ios', 'android']) {
        const uri = `/channels/${channel}/bundles/sample-app/${channel}-release/bundle.${platform}.hbc.gz`;
        expect(await handler(event(`/${platform}/sample-app/1/${channel}`))).toMatchObject({
          uri,
          headers: { 'x-bundle': [{ key: 'X-Bundle', value: uri }] },
        });
      }
    }
  });

  it('never reads legacy state when a registered channel deployment is missing', async () => {
    register('sample-app', 'next');
    state('sample-app', 'legacy');
    expect(await configuredHandler(event('/ios/sample-app/1/next'))).toEqual({
      status: '404',
      statusDescription: 'Deployment not found',
    });
    expect(reads).toEqual([
      'deployments/sample-app/selectors/next.json',
      'channels/next/deployments/sample-app/deployment_state',
    ]);
  });

  it.each(['{', '{"version":2,"type":"CHANNEL"}', '{"version":1,"type":"UNKNOWN"}'])(
    'does not fall back on corrupt metadata: %s',
    async (body) => {
      objects.set('deployments/sample-app/selectors/next.json', body);
      state('sample-app', 'legacy');
      await expect(configuredHandler(event('/ios/sample-app/1/next'))).rejects.toThrow('Invalid selector registration');
      expect(reads).toEqual(['deployments/sample-app/selectors/next.json']);
    }
  );

  it('does not treat a registry access failure as an unregistered tag', async () => {
    vi.spyOn(S3Client.prototype, 'getObject').mockRejectedValue(new Error('AccessDenied'));
    const resolve = vi.spyOn(DeployManager, 'resolveDeploymentId');
    await expect(configuredHandler(event('/ios/sample-app/1/next'))).rejects.toThrow('AccessDenied');
    expect(resolve).not.toHaveBeenCalled();
  });

  it('keeps cluster selection in the registered channel', async () => {
    register('sample-app', 'Preview_2');
    objects.set(
      'channels/Preview_2/deployments/sample-app/clusters/testers.deploymentInfo',
      JSON.stringify({ deploymentId: 'cluster-release' })
    );
    expect(await createOriginRequestHandler(context)(event('/android/sample-app/testers/Preview_2'))).toMatchObject({
      uri: '/channels/Preview_2/bundles/sample-app/cluster-release/bundle.android.hbc.gz',
    });
  });

  it('retains the cluster access restriction in the exported handler', async () => {
    register('sample-app', 'next');
    expect(await configuredHandler(event('/ios/sample-app/testers/next'))).toMatchObject({ status: '400' });
    expect(reads).toEqual(['deployments/sample-app/selectors/next.json']);
  });

  it.each(['bundle', 'next'])('does not let query parameters override %s', async (selector) => {
    register('sample-app', 'next');
    state('sample-app', 'legacy');
    state('sample-app', 'release', 'next');
    const querystring = 'channel=another&cache=hello%20world';
    const uri =
      selector === 'bundle'
        ? '/bundles/sample-app/legacy/bundle.ios.hbc.gz'
        : '/channels/next/bundles/sample-app/release/bundle.ios.hbc.gz';
    expect(await configuredHandler(event(`/ios/sample-app/1/${selector}`, querystring))).toMatchObject({
      uri,
      querystring,
    });
  });

  it.each([
    '/channels/next/ios/sample-app/1/bundle',
    '/ios/sample-app/1',
    '/ios/sample-app/1/next/extra',
    '/ios-other/sample-app/1/next',
  ])('rejects malformed channel route %s', async (uri) => {
    register('sample-app', 'next');
    const resolve = vi.spyOn(DeployManager, 'resolveDeploymentId');
    expect(await configuredHandler(event(uri))).toMatchObject({ status: '400' });
    expect(resolve).not.toHaveBeenCalled();
  });
});
