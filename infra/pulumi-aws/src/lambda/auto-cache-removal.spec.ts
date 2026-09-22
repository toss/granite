import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import type { S3EventRecord } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processRecord } from './auto-cache-removal';

describe('channel cache removal events', () => {
  const cloudfront = mockClient(CloudFrontClient);
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    cloudfront.on(CreateInvalidationCommand).resolves({});
  });
  afterEach(() => {
    cloudfront.reset();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function record(key: string, eventName: string): S3EventRecord {
    return { eventName, s3: { bucket: { name: 'sample-bucket' }, object: { key } } } as S3EventRecord;
  }

  it.each(['ObjectCreated:Put', 'ObjectRemoved:Delete'])(
    'decodes a channel pointer key and invalidates the app selectors for %s',
    async (eventName) => {
      const key = 'channels/preview/deployments/sample-app/deployment_state';
      const result = await processRecord(record(encodeURIComponent(key), eventName), 'sample-distribution');
      expect(result).toMatchObject({ key, invalidated: true });
      const commands = cloudfront.commandCalls(CreateInvalidationCommand);
      expect(commands).toHaveLength(1);
      expect(commands[0]!.args[0].input).toMatchObject({
        DistributionId: 'sample-distribution',
        InvalidationBatch: {
          Paths: {
            Quantity: 2,
            Items: ['/ios/sample-app/*', '/android/sample-app/*'],
          },
        },
      });
    }
  );

  it('ignores bundle uploads under the channel notification prefix', async () => {
    const key = 'channels/preview/bundles/sample-app/release/bundle.ios.hbc.gz';
    expect(await processRecord(record(key, 'ObjectCreated:Put'), 'sample-distribution')).toEqual({
      key,
      invalidated: false,
    });
    expect(cloudfront.calls()).toHaveLength(0);
  });

  it('sends a service invalidation for a new selector registration', async () => {
    const key = 'deployments/sample-app/selectors/next.json';
    expect(await processRecord(record(key, 'ObjectCreated:Put'), 'sample-distribution')).toMatchObject({
      key,
      invalidated: true,
      paths: ['/ios/sample-app/*', '/android/sample-app/*'],
    });
    expect(cloudfront.commandCalls(CreateInvalidationCommand)).toHaveLength(1);
  });

  it('uses distinct caller references for simultaneous invalidations', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    await Promise.all(
      ['sample-app', 'another-app'].map((appName) =>
        processRecord(
          record(`channels/preview/deployments/${appName}/deployment_state`, 'ObjectCreated:Put'),
          'sample-distribution'
        )
      )
    );
    const commands = cloudfront.commandCalls(CreateInvalidationCommand);
    expect(commands).toHaveLength(2);
    const references = commands.map((call) => call.args[0].input.InvalidationBatch?.CallerReference);
    expect(new Set(references).size).toBe(2);
  });
});
