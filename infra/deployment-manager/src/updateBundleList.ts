import { NoSuchKey } from '@aws-sdk/client-s3';
import { readBundleList } from './readBundleList';
import { S3Client } from './s3';
import type { DeploymentInfo } from './types';
import { writeBundleList } from './writeBundleList';

interface UpdateBundleListConfig {
  appName: string;
  newDeploymentInfo: DeploymentInfo;
}

export async function updateBundleList(
  { appName, newDeploymentInfo }: UpdateBundleListConfig,
  context: { s3Client: S3Client }
) {
  const previousDeployments = await readBundleList(appName, context).catch((error) => {
    if (error instanceof NoSuchKey) {
      return [];
    }
    throw error;
  });

  await writeBundleList(appName, [newDeploymentInfo, ...previousDeployments], context);
}
