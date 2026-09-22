import { randomUUID } from 'node:crypto';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { validateChannel } from '@granite-js/deployment-manager';
import { extractAppName, extractClusterId, isCurrentFile, isClusterDeploymentInfoFile } from './pathParser';

// Initialize CloudFront client
const cloudFrontClient = new CloudFrontClient({});

/**
 * Determine CloudFront paths to invalidate based on S3 object key
 */
export function getPathsToInvalidate(key: string): string[] {
  if (key.startsWith('channels/')) {
    const [, channel, ...parts] = key.split('/');
    try {
      validateChannel(channel ?? '');
    } catch {
      return [];
    }
    key = parts.join('/');
  }
  const appName = extractAppName(key);

  if (!appName) {
    return [];
  }

  // Rule 1: deployments/<appName>/CURRENT file
  // Channels follow the group segment or use a query parameter. CloudFront only
  // supports trailing wildcards, so evict this app's selectors across channels.
  if (isCurrentFile(key)) {
    return [`/ios/${appName}/*`, `/android/${appName}/*`];
  }

  // Rule 2: deployments/<appName>/clusters/<cluster-id>.deploymentInfo file
  if (isClusterDeploymentInfoFile(key)) {
    const clusterId = extractClusterId(key);

    if (clusterId) {
      return [`/ios/${appName}/${clusterId}/*`, `/android/${appName}/${clusterId}/*`];
    }
  }

  // No matching rules
  return [];
}

/**
 * Create CloudFront invalidation for specified paths
 */
export async function createInvalidation(paths: string[], distributionId: string): Promise<string> {
  const callerReference = `s3-triggered-invalidation-${randomUUID()}`;

  const params = {
    DistributionId: distributionId,
    InvalidationBatch: {
      CallerReference: callerReference,
      Paths: {
        Quantity: paths.length,
        Items: paths,
      },
    },
  };

  try {
    const command = new CreateInvalidationCommand(params);
    const response = await cloudFrontClient.send(command);

    return response?.Invalidation?.Id || callerReference;
  } catch (error) {
    console.error('Error creating CloudFront invalidation:', error);
    throw error;
  }
}
