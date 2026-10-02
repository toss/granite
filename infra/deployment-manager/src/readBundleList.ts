import type { DeploymentContext } from './channel';
import { paths } from './s3';
import type { DeploymentInfo } from './types';

export async function readBundleList(appName: string, context: DeploymentContext): Promise<DeploymentInfo[]> {
  const { s3Client } = context;
  const data = await s3Client.getObject(paths.bundleList({ appName, channel: context.channel }));

  return JSON.parse(data);
}
