import { paths, type S3Client } from './s3';
import type { DeploymentId } from './types';

interface ClusterRolloutConfig {
  appName: string;
  deploymentId: DeploymentId;
  clusterId: string;
}

export async function rolloutCluster(
  { appName, deploymentId, clusterId }: ClusterRolloutConfig,
  context: { s3Client: S3Client }
) {
  const { s3Client } = context;

  await s3Client.putObject(paths.clusterDeploymentState(appName, clusterId), {
    Body: JSON.stringify({ deploymentId }),
    ContentType: 'application/json',
  });
}
