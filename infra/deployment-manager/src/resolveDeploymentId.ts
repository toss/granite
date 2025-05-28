import { NoSuchBucket, NoSuchKey } from '@aws-sdk/client-s3';
import { parse } from 'valibot';
import { MAX_GROUP_ID } from './constants';
import { InternalServerError } from './errors/InternalServerError';
import { InvalidRequest } from './errors/InvalidRequest';
import { NotFoundError } from './errors/NotFoundError';
import { readDeploymentState } from './readDeploymentState';
import { S3Client } from './s3/client';
import { paths } from './s3/paths';
import { clusterDeploymentInfo } from './types';

interface ResolveDeploymentIdConfig {
  appName: string;
  groupId: string;
  allowAccessCluster: boolean;
}

export function resolveDeploymentId(
  { appName, groupId, allowAccessCluster }: ResolveDeploymentIdConfig,
  context: { s3Client: S3Client }
) {
  const numericGroupId = Number(groupId);

  if (isNaN(numericGroupId) && allowAccessCluster) {
    return resolveDeploymentIdByCluster(appName, groupId, context);
  } else if (numericGroupId >= 1 && numericGroupId <= MAX_GROUP_ID) {
    return resolveDeploymentIdByGroupId(appName, numericGroupId, context);
  }

  throw new InvalidRequest(`invalid groupId: ${groupId}`);
}

async function resolveDeploymentIdByGroupId(appName: string, numericGroupId: number, context: { s3Client: S3Client }) {
  const currentDeploymentState = await readDeploymentState(appName, context);

  switch (currentDeploymentState.type) {
    case 'PENDING': {
      throw new NotFoundError('Available deployment id not found');
    }
    case 'STABLE': {
      return currentDeploymentState.deploymentId;
    }
    case 'CANARY': {
      const { groupIdsCandidate, deploymentId, progress } = currentDeploymentState;
      const { old: oldDeploymentId, target: targetDeploymentId } = deploymentId;
      const canaryGroupIndex = Math.floor((progress.current / 100) * MAX_GROUP_ID);
      const targetGroupIds = groupIdsCandidate.slice(0, canaryGroupIndex);

      const isCanaryDeploymentTarget = targetGroupIds.includes(numericGroupId.toString());

      // 카나리 배포 대상에 포함된 경우, 새 번들을 제공
      return isCanaryDeploymentTarget ? targetDeploymentId : oldDeploymentId;
    }
  }
}

async function resolveDeploymentIdByCluster(appName: string, clusterId: string, context: { s3Client: S3Client }) {
  const { s3Client } = context;

  try {
    const clusterDeploymentInfoPath = paths.clusterDeploymentInfoPath(appName, clusterId);
    const rawData = await s3Client.getObject(clusterDeploymentInfoPath);
    const deploymentInfo = parse(clusterDeploymentInfo, JSON.parse(rawData));

    return deploymentInfo.deploymentId;
  } catch (error) {
    if (error instanceof NoSuchKey || error instanceof NoSuchBucket) {
      throw new NotFoundError(`cluster deployment info not found: ${clusterId}`);
    }
    throw new InternalServerError('resolveDeploymentIdByCluster', error);
  }
}
