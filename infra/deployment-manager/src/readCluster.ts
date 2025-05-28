import { parse } from 'valibot';
import { S3Client } from './s3/client';
import { paths } from './s3/paths';
import { clusterDeploymentInfo } from './types';

export interface ReadClusterConfig {
  appName: string;
  clusterId: string;
}

export async function readCluster({ appName, clusterId }: ReadClusterConfig, context: { s3Client: S3Client }) {
  const { s3Client } = context;

  try {
    const deploymentInfoPath = paths.clusterDeploymentInfoPath(appName, clusterId);
    const rawData = await s3Client.getObject(deploymentInfoPath);
    const { deploymentId } = parse(clusterDeploymentInfo, JSON.parse(rawData));

    return deploymentId;
  } catch {
    return null;
  }
}
