import { DeployManager, NoSuchKey, S3Client } from '@granite-js/deployment-manager';
import type { CloudFrontRequestEvent } from 'aws-lambda';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let createOriginRequestHandler: typeof import('./origin-request').createOriginRequestHandler;
const context = { bucketName: 'sample-bucket', region: 'us-east-1', allowAccessCluster: true };

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

beforeAll(async () => {
  vi.stubGlobal('_BUCKET_NAME', context.bucketName);
  vi.stubGlobal('_BUCKET_REGION', context.region);
  ({ createOriginRequestHandler } = await import('./origin-request'));
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => vi.unstubAllGlobals());

describe('channel bundle routing', () => {
  it.each(['custom', 'custom@preview', 'channels'])('preserves legacy filename tag %s', async (tag) => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ type: 'STABLE', deploymentId: 'legacy-release' }));
    expect(await createOriginRequestHandler(context)(event(`/ios/sample-app/1/${tag}`))).toEqual(
      expect.objectContaining({ uri: `/bundles/sample-app/legacy-release/bundle.ios.${tag}.hbc.gz` })
    );
    expect(getObject).toHaveBeenCalledExactlyOnceWith('deployments/sample-app/deployment_state');
  });

  it('resolves legacy and named-channel requests against independent state and bundle keys', async () => {
    const getObject = vi.spyOn(S3Client.prototype, 'getObject').mockImplementation(async (key) => {
      const state: Record<string, string> = {
        'deployments/sample-app/deployment_state': 'legacy-release',
        'channels/stable/deployments/sample-app/deployment_state': 'stable-release',
        'channels/preview/deployments/sample-app/deployment_state': 'preview-release',
      };
      if (!state[key]) {
        throw new NoSuchKey({ $metadata: {}, message: 'Not found' });
      }
      return JSON.stringify({ type: 'STABLE', deploymentId: state[key] });
    });
    const handler = createOriginRequestHandler(context);
    for (const channel of [undefined, 'stable', 'preview']) {
      const prefix = channel ? `/channels/${channel}` : '';
      const querystring = channel ? `channel=${channel}` : '';
      const deploymentId = channel ? `${channel}-release` : 'legacy-release';
      for (const platform of ['ios', 'android']) {
        const uri = `${prefix}/bundles/sample-app/${deploymentId}/bundle.${platform}.hbc.gz`;
        expect(await handler(event(`/${platform}/sample-app/1/bundle`, querystring))).toEqual(
          expect.objectContaining({
            uri,
            querystring: '',
            headers: { 'x-bundle': [{ key: 'X-Bundle', value: uri }] },
          })
        );
      }
    }
    expect(getObject).toHaveBeenCalledTimes(6);
  });

  it('returns 404 for a missing channel, including shared, without reading legacy state', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockRejectedValue(new NoSuchKey({ $metadata: {}, message: 'Not found' }));
    const handler = createOriginRequestHandler(context);
    for (const appName of ['sample-app', 'shared']) {
      expect(await handler(event(`/ios/${appName}/1/bundle`, 'channel=preview'))).toEqual({
        status: '404',
        statusDescription: 'Deployment not found',
      });
    }
    expect(getObject.mock.calls).toEqual([
      ['channels/preview/deployments/sample-app/deployment_state'],
      ['channels/preview/deployments/shared/deployment_state'],
    ]);
  });

  it('keeps cluster targeting and filename tags inside the selected channel', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ deploymentId: 'cluster-release' }));
    const handler = createOriginRequestHandler(context);
    expect(await handler(event('/android/sample-app/testers/custom', 'channel=Preview_2'))).toEqual(
      expect.objectContaining({
        uri: '/channels/Preview_2/bundles/sample-app/cluster-release/bundle.android.custom.hbc.gz',
      })
    );
    expect(getObject).toHaveBeenCalledExactlyOnceWith(
      'channels/Preview_2/deployments/sample-app/clusters/testers.deploymentInfo'
    );
  });

  it('retains the cluster access restriction for channel routes', async () => {
    const getObject = vi.spyOn(S3Client.prototype, 'getObject');
    const handler = createOriginRequestHandler({ ...context, allowAccessCluster: false });
    expect(await handler(event('/ios/sample-app/testers/bundle', 'channel=preview'))).toEqual(
      expect.objectContaining({ status: '400' })
    );
    expect(getObject).not.toHaveBeenCalled();
  });

  it.each([
    'channel=',
    'channel=../stable',
    'channel=a%2Fb',
    'channel=a+b',
    'channel=preview&channel=stable',
    'channel=preview&channel=preview',
    'channel=%ZZ',
    'channel=preview&%63hannel=stable',
  ])('rejects invalid channel query before reading state: %s', async (querystring) => {
    const resolve = vi.spyOn(DeployManager, 'resolveDeploymentId');
    expect(await createOriginRequestHandler(context)(event('/ios/sample-app/1/bundle', querystring))).toEqual(
      expect.objectContaining({ status: '400' })
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    '/channels/preview/ios/sample-app/1/bundle',
    '/ios/sample-app/1',
    '/ios/sample-app/1/bundle/extra',
    '/ios-other/sample-app/1/bundle',
    '/ios//1/bundle',
  ])('rejects malformed paths with a channel query: %s', async (uri) => {
    const resolve = vi.spyOn(DeployManager, 'resolveDeploymentId');
    expect(await createOriginRequestHandler(context)(event(uri, 'channel=preview'))).toEqual(
      expect.objectContaining({ status: '400' })
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('preserves unrelated query parameters and removes only the channel before the S3 request', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ type: 'STABLE', deploymentId: 'release' }));
    const handler = createOriginRequestHandler(context);
    expect(await handler(event('/ios/sample-app/1/bundle', 'cache=one&channel=preview&cache=two'))).toEqual(
      expect.objectContaining({
        uri: '/channels/preview/bundles/sample-app/release/bundle.ios.hbc.gz',
        querystring: 'cache=one&cache=two',
      })
    );
    expect(getObject).toHaveBeenCalledExactlyOnceWith('channels/preview/deployments/sample-app/deployment_state');
  });

  it('keeps legacy query strings byte-for-byte when no channel is specified', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ type: 'STABLE', deploymentId: 'legacy-release' }));
    const querystring = 'cache=hello%20world&cache=two';
    expect(await createOriginRequestHandler(context)(event('/ios/sample-app/1/bundle', querystring))).toEqual(
      expect.objectContaining({ uri: '/bundles/sample-app/legacy-release/bundle.ios.hbc.gz', querystring })
    );
    expect(getObject).toHaveBeenCalledExactlyOnceWith('deployments/sample-app/deployment_state');
  });
});
