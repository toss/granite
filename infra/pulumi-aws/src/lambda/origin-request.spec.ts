import { DeployManager, NoSuchKey, S3Client } from '@granite-js/deployment-manager';
import type { CloudFrontRequestEvent } from 'aws-lambda';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let createOriginRequestHandler: typeof import('./origin-request').createOriginRequestHandler;
const context = { bucketName: 'sample-bucket', region: 'us-east-1', allowAccessCluster: true };

function event(uri: string): CloudFrontRequestEvent {
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

beforeAll(async () => {
  vi.stubGlobal('_BUCKET_NAME', context.bucketName);
  vi.stubGlobal('_BUCKET_REGION', context.region);
  ({ createOriginRequestHandler } = await import('./origin-request'));
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => vi.unstubAllGlobals());

describe('channel bundle routing', () => {
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
    for (const prefix of ['', '/channels/stable', '/channels/preview']) {
      const deploymentId = prefix ? `${prefix.split('/')[2]}-release` : 'legacy-release';
      for (const platform of ['ios', 'android']) {
        const uri = `${prefix}/bundles/sample-app/${deploymentId}/bundle.${platform}.hbc.gz`;
        expect(await handler(event(`${prefix}/${platform}/sample-app/1/bundle`))).toEqual(
          expect.objectContaining({
            uri,
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
      expect(await handler(event(`/channels/preview/ios/${appName}/1/bundle`))).toEqual({
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
    expect(await handler(event('/channels/Preview_2/android/sample-app/testers/custom'))).toEqual(
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
    expect(await handler(event('/channels/preview/ios/sample-app/testers/bundle'))).toEqual(
      expect.objectContaining({ status: '400' })
    );
    expect(getObject).not.toHaveBeenCalled();
  });

  it.each([
    '/channels//ios/sample-app/1/bundle',
    '/channels/../ios/sample-app/1/bundle',
    '/channels/%2E%2E/ios/sample-app/1/bundle',
    '/channels/a%2Fb/ios/sample-app/1/bundle',
    '/channels/preview/ios/sample-app/1',
    '/channels/preview/ios/sample-app/1/bundle/extra',
    '/channels/preview/ios-other/sample-app/1/bundle',
    '/channels/preview/ios//1/bundle',
  ])('rejects malformed channel routes before reading state: %s', async (uri) => {
    const resolve = vi.spyOn(DeployManager, 'resolveDeploymentId');
    expect(await createOriginRequestHandler(context)(event(uri))).toEqual(expect.objectContaining({ status: '400' }));
    expect(resolve).not.toHaveBeenCalled();
  });
});
