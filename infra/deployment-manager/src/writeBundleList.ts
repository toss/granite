import type { DeploymentContext } from './channel';
import { MAX_HISTORY_COUNT } from './constants';
import { paths } from './s3';
import type { DeploymentInfo } from './types';

export async function writeBundleList(appName: string, deploymentInfo: DeploymentInfo[], context: DeploymentContext) {
  const { s3Client } = context;

  await s3Client.putObject(paths.bundleList(appName, context.channel), {
    Body: JSON.stringify(deploymentInfo.slice(0, MAX_HISTORY_COUNT)),
    ContentType: 'application/json',
  });
}
