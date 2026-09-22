import { NoSuchKey } from '@aws-sdk/client-s3';
import type { DeploymentContext } from './channel';
import { readBundleList } from './readBundleList';
import type { DeploymentInfo } from './types';
import { writeBundleList } from './writeBundleList';

interface UpdateBundleListConfig {
  appName: string;
  newDeploymentInfo: DeploymentInfo;
}

export async function updateBundleList(
  { appName, newDeploymentInfo }: UpdateBundleListConfig,
  context: DeploymentContext
) {
  const previousDeployments = await readBundleList(appName, context).catch((error) => {
    if (error instanceof NoSuchKey) {
      return [];
    }
    throw error;
  });

  await writeBundleList(appName, [newDeploymentInfo, ...previousDeployments], context);
}
