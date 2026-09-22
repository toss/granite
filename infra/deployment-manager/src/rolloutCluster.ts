import type { DeploymentContext } from './channel';
import { paths } from './s3';
import type { DeploymentId } from './types';

interface ClusterRolloutConfig {
  appName: string;
  deploymentId: DeploymentId;
  clusterId: string;
}

export async function rolloutCluster(
  { appName, deploymentId, clusterId }: ClusterRolloutConfig,
  context: DeploymentContext
) {
  const { s3Client } = context;

  await s3Client.putObject(paths.clusterDeploymentInfoPath({ appName, clusterId, channel: context.channel }), {
    Body: JSON.stringify({ deploymentId }),
    ContentType: 'application/json',
  });
}
