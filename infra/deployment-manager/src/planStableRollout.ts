import type { StableDeploymentState, DeploymentId } from './types';

export interface PlanStableRolloutConfig {
  deploymentId: DeploymentId;
}

export function planStableRollout(config: PlanStableRolloutConfig): StableDeploymentState {
  return {
    type: 'STABLE',
    deploymentId: config.deploymentId,
  };
}
