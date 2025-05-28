export function getPackageManager(): {
  packageManager: string;
  version: string | null;
} {
  const userAgent = process.env.npm_config_user_agent;

  if (!userAgent) {
    return {
      packageManager: 'npm',
      version: '0.0.0',
    };
  }
  const [packageManagerInfo] = userAgent.match(/(\w+)\/(\d+\.\d+\.\d+)/) || [];
  const [packageManager, version] = packageManagerInfo?.split('/') ?? ['npm', null];

  if (!packageManager) {
    return {
      packageManager: 'npm',
      version: '0.0.0',
    };
  }

  return {
    packageManager,
    version: version ?? '0.0.0',
  };
}
