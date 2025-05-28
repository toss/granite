export const paths = {
  bundlePathPrefix: (appName: string, deploymentId: string) => `bundles/${appName}/${deploymentId}` as const,
  bundleList: (appName: string) => `deployments/${appName}/DEPLOYMENTS` as const,
  deploymentState: (appName: string) => `deployments/${appName}/deployment_state` as const,
  clusterDeploymentState: (appName: string, clusterId: string) =>
    `deployments/${appName}/clusters/${clusterId}` as const,
  clusterDeploymentInfoPath: (appName: string, clusterId: string) =>
    `deployments/${appName}/clusters/${clusterId}.deploymentInfo` as const,
} as const;
