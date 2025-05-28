export function getBundleKey({
  appName,
  platform,
  deploymentId,
}: {
  appName: string;
  platform: 'ios' | 'android';
  deploymentId: string;
}) {
  const bundleUrlPrefix = `bundles/${appName}/${deploymentId}`;

  switch (platform) {
    case 'ios': {
      return `${bundleUrlPrefix}`;
    }
    case 'android': {
      return `${bundleUrlPrefix}`;
    }
  }
}
