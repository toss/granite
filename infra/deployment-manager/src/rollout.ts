import type { DeploymentContext } from './channel';
import { paths } from './s3';
import type { DeploymentState } from './types';

export async function rollout(
  { state, appName }: { state: DeploymentState; appName: string },
  context: DeploymentContext
): Promise<DeploymentState> {
  const { s3Client } = context;

  await s3Client.putObject(paths.deploymentState(appName, context.channel), {
    Body: JSON.stringify(state),
    ContentType: 'application/json',
  });

  return state;
}
