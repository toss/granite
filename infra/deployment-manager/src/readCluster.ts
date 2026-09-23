import { parse } from 'valibot';
import type { DeploymentContext } from './channel';
import { paths } from './s3/paths';
import { clusterDeploymentInfo } from './types';

export interface ReadClusterConfig {
  appName: string;
  clusterId: string;
}

export async function readCluster({ appName, clusterId }: ReadClusterConfig, context: DeploymentContext) {
  const { s3Client } = context;

  const deploymentInfoPath = paths.clusterDeploymentInfoPath({ appName, clusterId, channel: context.channel });
  try {
    const rawData = await s3Client.getObject(deploymentInfoPath);
    const { deploymentId } = parse(clusterDeploymentInfo, JSON.parse(rawData));

    return deploymentId;
  } catch {
    return null;
  }
}
