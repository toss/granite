import type { CloudFrontResponseEvent } from 'aws-lambda';
import { describe, expect, it } from 'vitest';
import { handler } from './origin-response';

function event(): CloudFrontResponseEvent {
  return {
    Records: [
      {
        cf: {
          config: {
            distributionDomainName: 'cdn.example.com',
            distributionId: 'sample',
            eventType: 'origin-response',
            requestId: 'request',
          },
          request: {
            uri: '/channels/next/bundles/sample-app/release/bundle.ios.hbc.gz',
            method: 'GET',
            clientIp: '127.0.0.1',
            querystring: '',
            headers: {
              'x-bundle': [{ key: 'X-Bundle', value: '/channels/next/bundles/sample-app/release/bundle.ios.hbc.gz' }],
            },
          },
          response: { status: '200', statusDescription: 'OK', headers: {} },
        },
      },
    ],
  };
}

describe('origin-response Lambda entry point', () => {
  it('copies deployment metadata while preserving compression and cache headers', async () => {
    const input = event();
    input.Records[0]!.cf.response.headers = {
      'x-amz-meta-x-deployment-id': [{ key: 'x-amz-meta-x-deployment-id', value: 'release' }],
      'x-amz-meta-x-deployment-deployed-at': [
        { key: 'x-amz-meta-x-deployment-deployed-at', value: '2026-01-01T00:00:00Z' },
      ],
      'content-encoding': [{ key: 'Content-Encoding', value: 'gzip' }],
      'cache-control': [{ key: 'Cache-Control', value: 'max-age=0, s-maxage=31536000' }],
    };
    expect(await handler(input)).toMatchObject({
      status: '200',
      headers: {
        'x-deployment-id': [{ key: 'X-Deployment-Id', value: 'release' }],
        'x-deployed-at': [{ key: 'X-Deployed-At', value: '2026-01-01T00:00:00Z' }],
        'content-encoding': [{ key: 'Content-Encoding', value: 'gzip' }],
        'cache-control': [{ key: 'Cache-Control', value: 'max-age=0, s-maxage=31536000' }],
      },
    });
  });

  it('passes unrelated origin responses through unchanged', async () => {
    const input = event();
    input.Records[0]!.cf.request.headers = {};
    expect(await handler(input)).toBe(input.Records[0]!.cf.response);
  });

  it.each(['200', '403', '404', '500'])(
    'preserves status %s when the origin has no deployment metadata',
    async (status) => {
      const input = event();
      input.Records[0]!.cf.response.status = status;
      expect(await handler(input)).toEqual({ status, statusDescription: 'OK', headers: {} });
    }
  );

  it('rejects an event without a request or response', async () => {
    await expect(handler({ Records: [] })).rejects.toThrow('invalid request');
  });
});
