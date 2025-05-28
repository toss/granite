import * as fs from 'fs';
import { resolveBundle } from './resolveBundle';
import type { S3Client } from './s3';
import type { DeploymentId, DeploymentInfo } from './types';
import { toDeployedAtString } from './utils/toDeployedAtString';

interface UploadBundleConfig {
  bundlePath: string;
  platform: 'android' | 'ios';
  tag?: string;
  appName: string;
  deploymentId: DeploymentId;
  deployedAt: Date;
}

export async function uploadBundle(
  { bundlePath, appName, deploymentId, deployedAt, platform, tag }: UploadBundleConfig,
  context: { s3Client: S3Client }
) {
  const { s3Client } = context;
  const bundlePathKey = resolveBundle({ appName, platform, deploymentId, tag });
  await s3Client.putObject(bundlePathKey, {
    Body: fs.createReadStream(bundlePath),
    Metadata: {
      'X-Deployment-Id': deploymentId,
      'X-Deployment-Deployed-At': toDeployedAtString(deployedAt),
    },
    CacheControl: 's-maxage=31536000, max-age=0',
    ...(bundlePath.endsWith('.gz') ? { ContentEncoding: 'gzip' } : {}),
  });

  const deploymentInfo: DeploymentInfo = {
    deployedAt: deployedAt.getTime(),
    deploymentId,
  };

  return { bundlePathKey, deploymentInfo };
}
