import { paths, type S3Client } from './s3';
import type { DeploymentInfo } from './types';

export async function readBundleList(appName: string, context: { s3Client: S3Client }): Promise<DeploymentInfo[]> {
  const { s3Client } = context;
  const data = await s3Client.getObject(paths.bundleList(appName));

  return JSON.parse(data);
}
