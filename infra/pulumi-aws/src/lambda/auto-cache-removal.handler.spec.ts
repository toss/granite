import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import type { Callback, Context, S3Event, S3EventRecord } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cloudfront = mockClient(CloudFrontClient);

function event(keys: string[]): S3Event {
  return {
    Records: keys.map(
      (key) =>
        ({
          eventName: 'ObjectCreated:Put',
          s3: { bucket: { name: 'sample-bucket' }, object: { key: encodeURIComponent(key) } },
        }) as S3EventRecord
    ),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('CLOUDFRONT_DISTRIBUTION_ID', 'sample-distribution');
  cloudfront.reset();
  cloudfront.rejects(new Error('Unexpected CloudFront command'));
  cloudfront.on(CreateInvalidationCommand).resolves({});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
afterAll(() => cloudfront.restore());

describe('cache-removal Lambda entry point', () => {
  it('processes mixed S3 notifications and only invalidates selectors and rollout pointers', async () => {
    const { handler } = await import('./auto-cache-removal');
    const callback = vi.fn<Callback>();
    await handler(
      event([
        'deployments/sample-app/selectors/next.json',
        'channels/next/deployments/sample-app/deployment_state',
        'channels/next/deployments/sample-app/clusters/testers.deploymentInfo',
        'channels/next/bundles/sample-app/release/bundle.ios.hbc.gz',
        'channels/next/deployments/sample-app/DEPLOYMENTS',
        'deployments/another-app/deployment_state',
      ]),
      {} as Context,
      callback
    );
    expect(callback).toHaveBeenCalledExactlyOnceWith(
      null,
      expect.objectContaining({
        results: [
          expect.objectContaining({ invalidated: true }),
          expect.objectContaining({ invalidated: true }),
          expect.objectContaining({ invalidated: true }),
          expect.objectContaining({ invalidated: false }),
          expect.objectContaining({ invalidated: false }),
          expect.objectContaining({ invalidated: true }),
        ],
      })
    );
    expect(
      cloudfront
        .commandCalls(CreateInvalidationCommand)
        .map((call) => call.args[0].input.InvalidationBatch?.Paths?.Items)
    ).toEqual([
      ['/ios/sample-app/*', '/android/sample-app/*'],
      ['/ios/sample-app/*', '/android/sample-app/*'],
      ['/ios/sample-app/testers/*', '/android/sample-app/testers/*'],
      ['/ios/another-app/*', '/android/another-app/*'],
    ]);
  });

  it('reports CloudFront failures through the callback so the invocation can be retried', async () => {
    const failure = new Error('CloudFront unavailable');
    cloudfront.on(CreateInvalidationCommand).rejectsOnce(failure).resolves({});
    const { handler } = await import('./auto-cache-removal');
    const records = event(['channels/next/deployments/sample-app/deployment_state']);
    const failed = vi.fn<Callback>();
    await handler(records, {} as Context, failed);
    expect(failed).toHaveBeenCalledExactlyOnceWith(failure);
    const retried = vi.fn<Callback>();
    await handler(records, {} as Context, retried);
    expect(retried).toHaveBeenCalledExactlyOnceWith(
      null,
      expect.objectContaining({
        message: 'Successfully processed all records',
      })
    );
    const calls = cloudfront.commandCalls(CreateInvalidationCommand);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.args[0].input.InvalidationBatch?.CallerReference).not.toBe(
      calls[1]!.args[0].input.InvalidationBatch?.CallerReference
    );
  });

  it('handles duplicate and reordered registration/state events without changing the invalidation scope', async () => {
    const { handler } = await import('./auto-cache-removal');
    const callback = vi.fn<Callback>();
    await handler(
      event([
        'channels/next/deployments/sample-app/deployment_state',
        'deployments/sample-app/selectors/next.json',
        'channels/next/deployments/sample-app/deployment_state',
      ]),
      {} as Context,
      callback
    );
    const calls = cloudfront.commandCalls(CreateInvalidationCommand);
    expect(calls).toHaveLength(3);
    expect(new Set(calls.map((call) => call.args[0].input.InvalidationBatch?.CallerReference)).size).toBe(3);
    for (const call of calls) {
      expect(call.args[0].input.InvalidationBatch?.Paths?.Items).toEqual([
        '/ios/sample-app/*',
        '/android/sample-app/*',
      ]);
    }
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fails before making requests when the distribution configuration is missing', async () => {
    vi.stubEnv('CLOUDFRONT_DISTRIBUTION_ID', undefined);
    const { handler } = await import('./auto-cache-removal');
    const callback = vi.fn<Callback>();
    await handler(event(['deployments/sample-app/selectors/next.json']), {} as Context, callback);
    expect(callback).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        message: 'CLOUDFRONT_DISTRIBUTION_ID environment variable is not set',
      })
    );
    expect(cloudfront.calls()).toHaveLength(0);
  });

  it('reports malformed S3 key encoding as an invocation failure', async () => {
    const { handler } = await import('./auto-cache-removal');
    const callback = vi.fn<Callback>();
    const malformed = event(['unused']);
    malformed.Records[0]!.s3.object.key = '%not-encoded';
    await handler(malformed, {} as Context, callback);
    expect(callback).toHaveBeenCalledExactlyOnceWith(expect.any(URIError));
    expect(cloudfront.calls()).toHaveLength(0);
  });
});
