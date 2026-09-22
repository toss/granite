import { parse, ValiError } from 'valibot';
import type { DeploymentContext } from './channel';
import { InternalServerError } from './errors/InternalServerError';
import { paths } from './s3/paths';
import { deploymentState, type DeploymentState } from './types';

export async function readDeploymentState(appName: string, context: DeploymentContext): Promise<DeploymentState> {
  const { s3Client } = context;

  const deploymentStatePath = paths.deploymentState(appName, context.channel);
  try {
    const rawData = await s3Client.getObject(deploymentStatePath);
    const state = parse(deploymentState, JSON.parse(rawData));
    return state;
  } catch (error) {
    if (error instanceof ValiError) {
      throw new InternalServerError('Invalid deployment state format', error);
    }
    throw error;
  }
}
