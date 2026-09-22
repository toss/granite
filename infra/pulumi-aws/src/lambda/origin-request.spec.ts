import { DeployManager, NoSuchKey, S3Client } from '@granite-js/deployment-manager';
import type { CloudFrontRequestEvent } from 'aws-lambda';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { PathChannelRoutes } from '../pathChannelRoutes';

let createOriginRequestHandler: typeof import('./origin-request').createOriginRequestHandler;
let configuredHandler: typeof import('./origin-request').handler;
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
  vi.stubGlobal('_PATH_CHANNEL_ROUTES', { 'sample-app': ['preview'] });
  ({ createOriginRequestHandler, handler: configuredHandler } = await import('./origin-request'));
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => vi.unstubAllGlobals());

describe('channel bundle routing', () => {
  const pathContext = { ...context, pathChannelRoutes: { 'sample-app': ['preview'], shared: ['preview'] } };

  it.each(['ios', 'android'])('uses a registered trailing channel on %s', async (platform) => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ type: 'STABLE', deploymentId: 'release' }));
    const handler = createOriginRequestHandler(pathContext);
    for (const appName of ['sample-app', 'shared']) {
      expect(await handler(event(`/${platform}/${appName}/1/preview`))).toEqual(
        expect.objectContaining({
          uri: `/channels/preview/bundles/${appName}/release/bundle.${platform}.hbc.gz`,
        })
      );
      expect(getObject).toHaveBeenLastCalledWith(`channels/preview/deployments/${appName}/deployment_state`);
    }
  });

  it('wires configured path routes into the exported Lambda handler', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ type: 'STABLE', deploymentId: 'release' }));
    expect(await configuredHandler(event('/ios/sample-app/1/preview'))).toEqual(
      expect.objectContaining({
        uri: '/channels/preview/bundles/sample-app/release/bundle.ios.hbc.gz',
      })
    );
    expect(getObject).toHaveBeenCalledExactlyOnceWith('channels/preview/deployments/sample-app/deployment_state');
  });

  it('keeps the same suffix as a legacy tag on apps without a registration', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ type: 'STABLE', deploymentId: 'legacy-release' }));
    expect(await createOriginRequestHandler(pathContext)(event('/ios/another-app/1/preview'))).toEqual(
      expect.objectContaining({
        uri: '/bundles/another-app/legacy-release/bundle.ios.preview.hbc.gz',
      })
    );
    expect(getObject).toHaveBeenCalledExactlyOnceWith('deployments/another-app/deployment_state');
  });

  it('preserves the default bundle and other legacy tags when path routes are enabled', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ type: 'STABLE', deploymentId: 'legacy-release' }));
    const handler = createOriginRequestHandler(pathContext);
    for (const [selector, file] of [
      ['bundle', 'bundle.ios.hbc.gz'],
      ['custom', 'bundle.ios.custom.hbc.gz'],
    ]) {
      expect(await handler(event(`/ios/sample-app/1/${selector}`))).toEqual(
        expect.objectContaining({
          uri: `/bundles/sample-app/legacy-release/${file}`,
        })
      );
      expect(getObject).toHaveBeenLastCalledWith('deployments/sample-app/deployment_state');
    }
  });

  it('never falls back to legacy state when a registered path channel has no deployment', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockRejectedValue(new NoSuchKey({ $metadata: {}, message: 'Not found' }));
    expect(await createOriginRequestHandler(pathContext)(event('/ios/sample-app/1/preview'))).toEqual({
      status: '404',
      statusDescription: 'Deployment not found',
    });
    expect(getObject).toHaveBeenCalledExactlyOnceWith('channels/preview/deployments/sample-app/deployment_state');
  });

  it.each([
    ['bundle', 'deployments/sample-app/deployment_state', '/bundles/sample-app/release/bundle.ios.hbc.gz'],
    [
      'preview',
      'channels/preview/deployments/sample-app/deployment_state',
      '/channels/preview/bundles/sample-app/release/bundle.ios.hbc.gz',
    ],
  ])('does not let query parameters select or override the %s route', async (selector, stateKey, bundleUri) => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ type: 'STABLE', deploymentId: 'release' }));
    const querystring = 'channel=stable&cache=hello%20world';
    expect(await createOriginRequestHandler(pathContext)(event(`/ios/sample-app/1/${selector}`, querystring))).toEqual(
      expect.objectContaining({ uri: bundleUri, querystring })
    );
    expect(getObject).toHaveBeenCalledExactlyOnceWith(stateKey);
  });

  it('rejects extra path segments on registered channel routes', async () => {
    const getObject = vi.spyOn(S3Client.prototype, 'getObject');
    expect(await createOriginRequestHandler(pathContext)(event('/ios/sample-app/1/preview/extra'))).toEqual(
      expect.objectContaining({ status: '400' })
    );
    expect(getObject).not.toHaveBeenCalled();
  });

  it.each<PathChannelRoutes>([
    { 'sample-app': ['bundle'] },
    { 'sample-app': ['../stable'] },
    { 'sample-app': ['preview', 'preview'] },
    { 'invalid/app': ['preview'] },
  ])('rejects invalid route registrations at handler construction: %j', (pathChannelRoutes) => {
    expect(() => createOriginRequestHandler({ ...context, pathChannelRoutes })).toThrow();
  });

  it.each(['custom', 'custom@preview', 'channels', 'preview'])('preserves legacy filename tag %s', async (tag) => {
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
    const handler = createOriginRequestHandler({
      ...context,
      pathChannelRoutes: { 'sample-app': ['stable', 'preview'] },
    });
    for (const channel of [undefined, 'stable', 'preview']) {
      const prefix = channel ? `/channels/${channel}` : '';
      const selector = channel ?? 'bundle';
      const deploymentId = channel ? `${channel}-release` : 'legacy-release';
      for (const platform of ['ios', 'android']) {
        const uri = `${prefix}/bundles/sample-app/${deploymentId}/bundle.${platform}.hbc.gz`;
        expect(await handler(event(`/${platform}/sample-app/1/${selector}`))).toEqual(
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
    const handler = createOriginRequestHandler(pathContext);
    for (const appName of ['sample-app', 'shared']) {
      expect(await handler(event(`/ios/${appName}/1/preview`))).toEqual({
        status: '404',
        statusDescription: 'Deployment not found',
      });
    }
    expect(getObject.mock.calls).toEqual([
      ['channels/preview/deployments/sample-app/deployment_state'],
      ['channels/preview/deployments/shared/deployment_state'],
    ]);
  });

  it('keeps cluster targeting inside the selected channel', async () => {
    const getObject = vi
      .spyOn(S3Client.prototype, 'getObject')
      .mockResolvedValue(JSON.stringify({ deploymentId: 'cluster-release' }));
    const handler = createOriginRequestHandler({ ...context, pathChannelRoutes: { 'sample-app': ['Preview_2'] } });
    expect(await handler(event('/android/sample-app/testers/Preview_2'))).toEqual(
      expect.objectContaining({
        uri: '/channels/Preview_2/bundles/sample-app/cluster-release/bundle.android.hbc.gz',
      })
    );
    expect(getObject).toHaveBeenCalledExactlyOnceWith(
      'channels/Preview_2/deployments/sample-app/clusters/testers.deploymentInfo'
    );
  });

  it('retains the cluster access restriction for channel routes', async () => {
    const getObject = vi.spyOn(S3Client.prototype, 'getObject');
    const handler = createOriginRequestHandler({ ...pathContext, allowAccessCluster: false });
    expect(await handler(event('/ios/sample-app/testers/preview'))).toEqual(expect.objectContaining({ status: '400' }));
    expect(getObject).not.toHaveBeenCalled();
  });

  it.each([
    '/channels/preview/ios/sample-app/1/bundle',
    '/ios/sample-app/1',
    '/ios/sample-app/1/preview/extra',
    '/ios-other/sample-app/1/preview',
  ])('rejects malformed channel paths: %s', async (uri) => {
    const resolve = vi.spyOn(DeployManager, 'resolveDeploymentId');
    expect(await createOriginRequestHandler(pathContext)(event(uri))).toEqual(
      expect.objectContaining({ status: '400' })
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('keeps existing query strings byte-for-byte without using them for routing', async () => {
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
