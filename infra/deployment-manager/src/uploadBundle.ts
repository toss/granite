import * as fs from 'fs';
import type { DeploymentContext } from './channel';
import { resolveBundle } from './resolveBundle';
import { registerChannel, reserveLegacyTag } from './selectorRegistration';
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
  context: DeploymentContext
) {
  const { s3Client } = context;
  const bundlePathKey = resolveBundle({ appName, platform, deploymentId, tag, channel: context.channel });
  if (context.channel !== undefined) {
    await registerChannel({ appName, channel: context.channel }, context);
  } else if (tag) {
    await reserveLegacyTag({ appName, selector: tag }, context);
  }
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
