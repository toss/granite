import { S3Event, S3EventRecord, Context, Callback } from 'aws-lambda';
import { getPathsToInvalidate, createInvalidation } from './utils/invalidation';

// Get CloudFront distribution ID from environment variables
const DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID;

/**
 * Lambda handler function that processes S3 events and creates CloudFront invalidations
 */
export const handler = async (event: S3Event, _: Context, callback: Callback) => {
  try {
    // Validate environment variables
    if (!DISTRIBUTION_ID) {
      throw new Error('CLOUDFRONT_DISTRIBUTION_ID environment variable is not set');
    }

    console.log('Event received:', JSON.stringify(event, null, 2));

    const invalidationResults = await Promise.all(
      event.Records.map(async (record: S3EventRecord) => {
        return await processRecord(record, DISTRIBUTION_ID);
      })
    );

    callback(null, {
      message: 'Successfully processed all records',
      results: invalidationResults,
    });
  } catch (error) {
    console.error('Error processing S3 event:', error);
    callback(error as Error);
  }
};

/**
 * Process individual S3 event record
 */
export async function processRecord(
  record: S3EventRecord,
  distributionId: string
): Promise<{ key: string; invalidated: boolean; paths?: string[]; invalidationId?: string }> {
  // Extract bucket name and object key
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  console.log(`Processing file: s3://${bucket}/${key}`);

  // Determine paths to invalidate based on file path
  const pathsToInvalidate = getPathsToInvalidate(key);

  if (pathsToInvalidate.length > 0) {
    console.log(`Paths to invalidate: ${pathsToInvalidate.join(', ')}`);

    // Create CloudFront invalidation
    const invalidationId = await createInvalidation(pathsToInvalidate, distributionId);

    return {
      key,
      invalidated: true,
      paths: pathsToInvalidate,
      invalidationId,
    };
  } else {
    console.log('No paths to invalidate for this file');

    return {
      key,
      invalidated: false,
    };
  }
}
