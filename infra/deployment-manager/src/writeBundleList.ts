import { MAX_HISTORY_COUNT } from './constants';
import { paths, type S3Client } from './s3';
import type { DeploymentInfo } from './types';

export async function writeBundleList(
  appName: string,
  deploymentInfo: DeploymentInfo[],
  context: { s3Client: S3Client }
) {
  const { s3Client } = context;

  await s3Client.putObject(paths.bundleList(appName), {
    Body: JSON.stringify(deploymentInfo.slice(0, MAX_HISTORY_COUNT)),
    ContentType: 'application/json',
  });
}
