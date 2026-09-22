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
});
