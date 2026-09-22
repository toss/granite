import { channelPrefix } from '../channel';

interface AppPathOptions {
  appName: string;
  channel?: string;
}

interface BundlePathOptions extends AppPathOptions {
  deploymentId: string;
}

interface ClusterPathOptions extends AppPathOptions {
  clusterId: string;
}

export const paths = {
  bundlePathPrefix: ({ appName, deploymentId, channel }: BundlePathOptions) =>
    `${channelPrefix(channel)}bundles/${appName}/${deploymentId}` as const,
  bundleList: ({ appName, channel }: AppPathOptions) =>
    `${channelPrefix(channel)}deployments/${appName}/DEPLOYMENTS` as const,
  deploymentState: ({ appName, channel }: AppPathOptions) =>
    `${channelPrefix(channel)}deployments/${appName}/deployment_state` as const,
  clusterDeploymentState: ({ appName, clusterId, channel }: ClusterPathOptions) =>
    `${channelPrefix(channel)}deployments/${appName}/clusters/${clusterId}` as const,
  clusterDeploymentInfoPath: ({ appName, clusterId, channel }: ClusterPathOptions) =>
    `${channelPrefix(channel)}deployments/${appName}/clusters/${clusterId}.deploymentInfo` as const,
} as const;
