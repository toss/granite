import { paths, type S3Client } from './s3';
import type { DeploymentState } from './types';

export async function rollout(
  { state, appName }: { state: DeploymentState; appName: string },
  context: { s3Client: S3Client }
): Promise<DeploymentState> {
  const { s3Client } = context;

  await s3Client.putObject(paths.deploymentState(appName), {
    Body: JSON.stringify(state),
    ContentType: 'application/json',
  });

  return state;
}
