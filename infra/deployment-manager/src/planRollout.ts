import { planCanaryRollout } from './planCanaryRollout';
import { planStableRollout } from './planStableRollout';
import type { DeploymentState, DeploymentId, StableDeploymentState, CanaryDeploymentState } from './types';

export interface PlanConfig {
  targetDeploymentId: DeploymentId;
  progress: number;
}

/**
 * 배포를 위한 DeploymentState를 생성합니다. 실제로 S3 저장된 값을 변경하진 않습니다.
 * DeployManager.rollout을 통해 생성된 새로운 DeploymentState S3에 반영해야 배포가 완료됩니다.
 */
export async function planRollout(currentState: DeploymentState, config: PlanConfig): Promise<DeploymentState> {
  switch (currentState.type) {
    case 'PENDING':
      return planFromPendingState(config);
    case 'STABLE':
      return planFromStableState(currentState, config);
    case 'CANARY':
      return planFromCanaryState(currentState, config);
  }
}

function planFromPendingState(config: PlanConfig) {
  if (isFullyRollout(config) !== true) {
    throw new Error('PENDING 상태에서는 STABLE 배포만 가능합니다.');
  }
  return planStableRollout({ deploymentId: config.targetDeploymentId });
}

function planFromStableState(currentState: StableDeploymentState, config: PlanConfig) {
  if (isRollback(config)) {
    throw new Error('STABLE 상태에서는 롤백이 불가능합니다.');
  }

  if (config.targetDeploymentId === currentState.deploymentId) {
    throw new Error(`이미 ${config.targetDeploymentId}로 100% 배포되어 있습니다.`);
  }

  return isFullyRollout(config)
    ? planStableRollout({ deploymentId: config.targetDeploymentId })
    : planCanaryRollout({
        previous: {
          deploymentId: currentState.deploymentId,
          progress: 0,
          groupIdsCandidate: null,
        },
        next: {
          deploymentId: config.targetDeploymentId,
          progress: config.progress,
        },
      });
}

function planFromCanaryState(currentState: CanaryDeploymentState, config: PlanConfig) {
  if (config.targetDeploymentId !== currentState.deploymentId.target) {
    throw new Error(
      `${config.targetDeploymentId}로 배포를 시도했습니다. 현재 ${currentState.deploymentId.old} -> ${currentState.deploymentId.target} 로의 점진적 배포가 진행 중입니다. 모든 트래픽을 ${currentState.deploymentId.old} 혹은 ${currentState.deploymentId.target}로 변경 후 재시도해주세요.`
    );
  }

  return isFullyRollout(config)
    ? planStableRollout({ deploymentId: config.targetDeploymentId })
    : planCanaryRollout({
        previous: {
          deploymentId: currentState.deploymentId.old,
          progress: currentState.progress.current,
          groupIdsCandidate: currentState.groupIdsCandidate,
        },
        next: {
          deploymentId: config.targetDeploymentId,
          progress: config.progress,
        },
      });
}

function isRollback(config: PlanConfig) {
  return config.progress === 0;
}

function isFullyRollout(config: PlanConfig) {
  return config.progress === 100;
}
