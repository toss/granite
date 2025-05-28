import { shuffle, range } from 'es-toolkit';
import { MAX_GROUP_ID } from './constants';
import type { CanaryDeploymentState, DeploymentId } from './types';

export interface PlanCanaryRolloutConfig {
  previous: {
    deploymentId: DeploymentId;
    progress: number;
    groupIdsCandidate: null | string[];
  };
  next: {
    deploymentId: DeploymentId;
    progress: number;
  };
}

export function planCanaryRollout(config: PlanCanaryRolloutConfig): CanaryDeploymentState {
  const { previous, next } = config;

  return {
    type: 'CANARY',
    deploymentId: {
      old: previous.deploymentId,
      target: next.deploymentId,
    },
    progress: {
      previous: previous.progress,
      current: next.progress,
    },
    // 점진적 배포를 처음 시작할 때 배포 대상 그룹 ID를 섞고 점진적 배포가 완료될 때까지 재사용합니다.
    // 매번 동일한 유저들이 실험 대상이 되지 않도록 하는 것입니다.
    groupIdsCandidate: previous.groupIdsCandidate ?? generateGroupIdCandidate(),
  };
}

/**
 * 1 ~ MAX_GROUP_ID 까지의 랜덤 숫자가 섞여진 배열을 반환합니다.
 */
function generateGroupIdCandidate() {
  return shuffle(range(1, MAX_GROUP_ID + 1).map(String));
}
