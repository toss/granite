import { channelPrefix } from '../channel';

export const paths = {
  bundlePathPrefix: (appName: string, deploymentId: string, channel?: string) =>
    `${channelPrefix(channel)}bundles/${appName}/${deploymentId}` as const,
  bundleList: (appName: string, channel?: string) =>
    `${channelPrefix(channel)}deployments/${appName}/DEPLOYMENTS` as const,
  deploymentState: (appName: string, channel?: string) =>
    `${channelPrefix(channel)}deployments/${appName}/deployment_state` as const,
  clusterDeploymentState: (appName: string, clusterId: string, channel?: string) =>
    `${channelPrefix(channel)}deployments/${appName}/clusters/${clusterId}` as const,
  clusterDeploymentInfoPath: (appName: string, clusterId: string, channel?: string) =>
    `${channelPrefix(channel)}deployments/${appName}/clusters/${clusterId}.deploymentInfo` as const,
} as const;
