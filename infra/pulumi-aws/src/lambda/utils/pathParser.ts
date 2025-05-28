/**
 * Utility functions for parsing S3 paths
 */

/**
 * Extracts the app name from an S3 object key
 */
export function extractAppName(key: string): string | null {
  const pathParts = key.split('/');

  if (pathParts.length < 2 || pathParts[0] !== 'deployments') {
    return null;
  }

  return pathParts[1] ?? null;
}

/**
 * Extracts the cluster ID from an S3 object key
 */
export function extractClusterId(key: string): string | null {
  const pathParts = key.split('/');

  if (
    pathParts.length < 4 ||
    pathParts[0] !== 'deployments' ||
    pathParts[2] !== 'clusters' ||
    !pathParts[3]?.endsWith('.deploymentInfo')
  ) {
    return null;
  }

  return pathParts[3]?.replace('.deploymentInfo', '') ?? null;
}

/**
 * Checks if the S3 object key is a CURRENT file
 */
export function isCurrentFile(key: string): boolean {
  const pathParts = key.split('/');

  return (
    pathParts.length === 3 &&
    pathParts[0] === 'deployments' &&
    ['CURRENT', 'deployment_state'].includes(pathParts[2] ?? '')
  );
}

/**
 * Checks if the S3 object key is a cluster deploymentInfo file
 */
export function isClusterDeploymentInfoFile(key: string): boolean {
  const pathParts = key.split('/');

  return Boolean(
    pathParts.length === 4 &&
      pathParts[0] === 'deployments' &&
      pathParts[2] === 'clusters' &&
      pathParts[3]?.endsWith('.deploymentInfo')
  );
}
