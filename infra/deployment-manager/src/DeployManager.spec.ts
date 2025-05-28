import { randomUUID } from 'crypto';
import { S3Client as BaseS3Client, GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { range, shuffle } from 'es-toolkit';
import { safeParse } from 'valibot';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DeployManager } from './DeployManager';
import { MAX_GROUP_ID } from './constants';
import { InternalServerError } from './errors/InternalServerError';
import { InvalidRequest } from './errors/InvalidRequest';
import { NotFoundError } from './errors/NotFoundError';
import { S3Client } from './s3/client';
import {
  deploymentState,
  type CanaryDeploymentState,
  type DeploymentState,
  type PendingDeploymentState,
  type StableDeploymentState,
} from './types';

describe('DeployManager', () => {
  const TEST_BUCKET = 'test';
  const TEST_APP_NAME = 'my-app';

  const PENDING_STATE: PendingDeploymentState = {
    type: 'PENDING',
  };

  const STABLE_STATE: StableDeploymentState = {
    type: 'STABLE',
    deploymentId: generateRandomDeploymentId(),
  };

  const CANARY_DEPLOY_PROGRESS_THRESHOLD = 50;
  const CANARY_STATE: CanaryDeploymentState = {
    type: 'CANARY',
    groupIdsCandidate: shuffle(range(1, 1001)).map(String),
    deploymentId: {
      old: generateRandomDeploymentId(),
      target: generateRandomDeploymentId(),
    },
    progress: {
      previous: 0,
      current: CANARY_DEPLOY_PROGRESS_THRESHOLD,
    },
  };

  const s3Mock = mockClient(BaseS3Client);
  const s3Client = new S3Client({ bucket: TEST_BUCKET });

  function generateRandomDeploymentId() {
    return randomUUID();
  }

  function generateNumericGroupId() {
    return Math.floor(Math.random() * 1000 + 1).toString();
  }

  function mockS3ReadableStream(mockedData: string) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(mockedData));
        controller.close();
      },
    });

    return Object.assign(stream, {
      transformToString: () => mockedData,
    });
  }

  afterEach(() => {
    s3Mock.reset();
  });

  describe('readDeploymentState', () => {
    describe('when the valid deployment state is existing', () => {
      const VALID_DEPLOYMENT_STATES: DeploymentState[] = [PENDING_STATE, STABLE_STATE, CANARY_STATE];

      beforeAll(() => {
        const pickedDeploymentStateIndex = Math.floor(Math.random() * VALID_DEPLOYMENT_STATES.length);
        s3Mock
          .on(GetObjectCommand, {
            Bucket: TEST_BUCKET,
            Key: `deployments/${TEST_APP_NAME}/deployment_state`,
          })
          .resolves({
            Body: mockS3ReadableStream(JSON.stringify(VALID_DEPLOYMENT_STATES[pickedDeploymentStateIndex])),
          });
      });

      it('should returns parsed deployment state', async () => {
        const result = await DeployManager.readDeploymentState(TEST_APP_NAME, {
          s3Client,
        });

        expect(safeParse(deploymentState, result)).toBeDefined();
      });
    });

    describe('when the deployment state is not valid', () => {
      beforeAll(() => {
        s3Mock
          .on(GetObjectCommand, {
            Bucket: TEST_BUCKET,
            Key: `deployments/${TEST_APP_NAME}/deployment_state`,
          })
          .resolves({
            Body: mockS3ReadableStream(
              JSON.stringify({
                type: 'UNKNOWN_TYPE',
                deploymentId: generateRandomDeploymentId(),
              })
            ),
          });
      });

      it('should throws `InternalServerError`', async () => {
        await expect(async () => await DeployManager.readDeploymentState(TEST_APP_NAME, { s3Client })).rejects.toThrow(
          InternalServerError
        );
      });
    });
  });

  describe('readCluster', () => {
    const CLUSTER_ID = `cluster-${Date.now()}`;

    describe('when the valid deployment info is existing', () => {
      beforeAll(() => {
        s3Mock
          .on(GetObjectCommand, {
            Bucket: TEST_BUCKET,
            Key: `deployments/${TEST_APP_NAME}/clusters/${CLUSTER_ID}.deploymentInfo`,
          })
          .resolves({
            Body: mockS3ReadableStream(
              JSON.stringify({
                deploymentId: generateRandomDeploymentId(),
              })
            ),
          });
      });

      it('should returns parsed deployment state', async () => {
        const result = await DeployManager.readCluster(
          {
            appName: TEST_APP_NAME,
            clusterId: CLUSTER_ID,
          },
          { s3Client }
        );

        expect(typeof result).toBe('string');
      });
    });

    describe('when the deployment state is not existing', () => {
      beforeAll(() => {
        s3Mock
          .on(GetObjectCommand, {
            Bucket: TEST_BUCKET,
            Key: `deployments/${TEST_APP_NAME}/clusters/${CLUSTER_ID}.deploymentInfo`,
          })
          .rejects(new NoSuchKey({ message: 'NoSuchKey', $metadata: {} }));
      });

      it('should returns null', async () => {
        const result = await DeployManager.readCluster(
          {
            appName: TEST_APP_NAME,
            clusterId: CLUSTER_ID,
          },
          { s3Client }
        );

        expect(result).toBeNull();
      });
    });

    describe('when the deployment state is not valid', () => {
      beforeAll(() => {
        s3Mock
          .on(GetObjectCommand, {
            Bucket: TEST_BUCKET,
            Key: `deployments/${TEST_APP_NAME}/deployment_state`,
          })
          .resolves({
            Body: mockS3ReadableStream(JSON.stringify({ wrongId: generateRandomDeploymentId() })),
          });
      });

      it('should returns null', async () => {
        const result = await DeployManager.readCluster(
          {
            appName: TEST_APP_NAME,
            clusterId: CLUSTER_ID,
          },
          { s3Client }
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('resolveDeploymentId', () => {
    describe('when provide numeric group id (1~1000)', () => {
      const GROUP_ID = generateNumericGroupId();

      describe('when the deployment state is `PENDING`', () => {
        beforeAll(() => {
          s3Mock
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(PENDING_STATE)),
            });
        });

        it('should throws `NotFoundError`', async () => {
          await expect(
            async () =>
              await DeployManager.resolveDeploymentId(
                {
                  appName: TEST_APP_NAME,
                  groupId: GROUP_ID,
                  allowAccessCluster: true,
                },
                { s3Client }
              )
          ).rejects.toThrow(NotFoundError);
        });
      });

      describe('when the deployment state is `STABLE`', () => {
        beforeAll(() => {
          s3Mock
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(STABLE_STATE)),
            });
        });

        it('should returns the deployment id', async () => {
          const result = await DeployManager.resolveDeploymentId(
            {
              appName: TEST_APP_NAME,
              groupId: GROUP_ID,
              allowAccessCluster: true,
            },
            { s3Client }
          );

          expect(result).toBe(STABLE_STATE.deploymentId);
        });
      });

      describe('when the deployment state is `CANARY`', () => {
        beforeEach(() => {
          s3Mock
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(CANARY_STATE)),
            });
        });

        it('should returns the deployment id (target)', async () => {
          const result = await DeployManager.resolveDeploymentId(
            {
              appName: TEST_APP_NAME,
              groupId: CANARY_STATE.groupIdsCandidate[0]!,
              allowAccessCluster: true,
            },
            { s3Client }
          );

          expect(result).toBe(CANARY_STATE.deploymentId.target);
        });

        it('should returns the deployment id (old)', async () => {
          const oldBundleGroupIndex = Math.floor(
            CANARY_STATE.groupIdsCandidate.length * (CANARY_DEPLOY_PROGRESS_THRESHOLD / 100) + 1
          );

          const result = await DeployManager.resolveDeploymentId(
            {
              appName: TEST_APP_NAME,
              groupId: CANARY_STATE.groupIdsCandidate[oldBundleGroupIndex]!,
              allowAccessCluster: true,
            },
            {
              s3Client,
            }
          );

          expect(result).toBe(CANARY_STATE.deploymentId.old);
        });
      });
    });

    describe('when provide numeric group id (out of range)', () => {
      const GROUP_ID = (MAX_GROUP_ID + 1).toString();

      describe('when the deployment state is `PENDING`', () => {
        beforeAll(() => {
          s3Mock
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(PENDING_STATE)),
            });
        });

        it('should throws `InvalidRequest`', async () => {
          await expect(
            async () =>
              await DeployManager.resolveDeploymentId(
                {
                  appName: TEST_APP_NAME,
                  groupId: GROUP_ID,
                  allowAccessCluster: true,
                },
                { s3Client }
              )
          ).rejects.toThrow(InvalidRequest);
        });
      });

      describe('when the deployment state is `STABLE`', () => {
        beforeAll(() => {
          s3Mock
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(STABLE_STATE)),
            });
        });

        it('should throws `InvalidRequest`', async () => {
          await expect(
            async () =>
              await DeployManager.resolveDeploymentId(
                {
                  appName: TEST_APP_NAME,
                  groupId: GROUP_ID,
                  allowAccessCluster: true,
                },
                { s3Client }
              )
          ).rejects.toThrow(InvalidRequest);
        });
      });

      describe('when the deployment state is `CANARY`', () => {
        beforeAll(() => {
          s3Mock
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(CANARY_STATE)),
            });
        });

        it('should throws `InvalidRequest`', async () => {
          await expect(
            async () =>
              await DeployManager.resolveDeploymentId(
                {
                  appName: TEST_APP_NAME,
                  groupId: GROUP_ID,
                  allowAccessCluster: true,
                },
                { s3Client }
              )
          ).rejects.toThrow(InvalidRequest);
        });
      });
    });

    describe('when provide non-numeric group id', () => {
      const CLUSTER_ID = `cluster-${Date.now()}`;
      const CLUSTER_DEPLOYMENT_ID = generateRandomDeploymentId();

      describe('when the deployment state is `PENDING`', () => {
        beforeAll(() => {
          s3Mock
            // Deployment state
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(PENDING_STATE)),
            })
            // Cluster's deployment info
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/clusters/${CLUSTER_ID}.deploymentInfo`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify({ deploymentId: CLUSTER_DEPLOYMENT_ID })),
            });
        });

        it('should returns the cluster deployment id', async () => {
          const result = await DeployManager.resolveDeploymentId(
            {
              appName: TEST_APP_NAME,
              groupId: CLUSTER_ID,
              allowAccessCluster: true,
            },
            { s3Client }
          );

          expect(result).toBe(CLUSTER_DEPLOYMENT_ID);
        });
      });

      describe('when the deployment state is `STABLE`', () => {
        beforeAll(() => {
          s3Mock
            // Deployment state
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(STABLE_STATE)),
            })
            // Cluster's deployment info
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/clusters/${CLUSTER_ID}.deploymentInfo`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify({ deploymentId: CLUSTER_DEPLOYMENT_ID })),
            });
        });

        it('should returns the cluster deployment id', async () => {
          const result = await DeployManager.resolveDeploymentId(
            {
              appName: TEST_APP_NAME,
              groupId: CLUSTER_ID,
              allowAccessCluster: true,
            },
            { s3Client }
          );

          expect(result).toBe(CLUSTER_DEPLOYMENT_ID);
        });
      });

      describe('when the deployment state is `CANARY`', () => {
        beforeAll(() => {
          s3Mock
            // Deployment state
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/deployment_state`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify(CANARY_STATE)),
            })
            // Cluster's deployment info
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/clusters/${CLUSTER_ID}.deploymentInfo`,
            })
            .resolves({
              Body: mockS3ReadableStream(JSON.stringify({ deploymentId: CLUSTER_DEPLOYMENT_ID })),
            });
        });

        it('should returns the cluster deployment id', async () => {
          const result = await DeployManager.resolveDeploymentId(
            {
              appName: TEST_APP_NAME,
              groupId: CLUSTER_ID,
              allowAccessCluster: true,
            },
            { s3Client }
          );

          expect(result).toBe(CLUSTER_DEPLOYMENT_ID);
        });
      });

      describe('when the cluster deployment info is not existing', () => {
        beforeAll(() => {
          s3Mock
            // Cluster's deployment info
            .on(GetObjectCommand, {
              Bucket: TEST_BUCKET,
              Key: `deployments/${TEST_APP_NAME}/clusters/${CLUSTER_ID}.deploymentInfo`,
            })
            .rejects(new NoSuchKey({ message: 'NoSuchKey', $metadata: {} }));
        });

        it('should throws `NotFoundError`', async () => {
          await expect(
            async () =>
              await DeployManager.resolveDeploymentId(
                {
                  appName: TEST_APP_NAME,
                  groupId: CLUSTER_ID,
                  allowAccessCluster: true,
                },
                { s3Client }
              )
          ).rejects.toThrow(NotFoundError);
        });
      });

      describe('when `allowAccessCluster` option is disabled', () => {
        it('should throws `InvalidRequest`', async () => {
          await expect(
            async () =>
              await DeployManager.resolveDeploymentId(
                {
                  appName: TEST_APP_NAME,
                  groupId: CLUSTER_ID,
                  allowAccessCluster: false,
                },
                {
                  s3Client,
                }
              )
          ).rejects.toThrow(InvalidRequest);
        });
      });
    });
  });

  describe('resolveBundle', () => {
    const APP_NAME = 'my-app';

    it('should returns gzipped hbc path for Android', () => {
      const deploymentId = generateRandomDeploymentId();
      expect(
        DeployManager.resolveBundle({
          appName: APP_NAME,
          platform: 'android',
          deploymentId,
        })
      ).toBe(`bundles/${APP_NAME}/${deploymentId}/bundle.android.hbc.gz`);
    });

    it('should returns gzipped hbc path for iOS', () => {
      const deploymentId = generateRandomDeploymentId();
      expect(
        DeployManager.resolveBundle({
          appName: APP_NAME,
          platform: 'ios',
          deploymentId,
        })
      ).toBe(`bundles/${APP_NAME}/${deploymentId}/bundle.ios.hbc.gz`);
    });

    it('should returns gzipped hbc path for Android (tagged)', () => {
      const deploymentId = generateRandomDeploymentId();
      expect(
        DeployManager.resolveBundle({
          appName: APP_NAME,
          platform: 'android',
          deploymentId,
          tag: '0_72_6-reav3',
        })
      ).toBe(`bundles/${APP_NAME}/${deploymentId}/bundle.android.0_72_6-reav3.hbc.gz`);
    });

    it('should returns gzipped hbc path for iOS (tagged)', () => {
      const deploymentId = generateRandomDeploymentId();
      expect(
        DeployManager.resolveBundle({
          appName: APP_NAME,
          platform: 'ios',
          deploymentId,
          tag: '0_72_6-reav3',
        })
      ).toBe(`bundles/${APP_NAME}/${deploymentId}/bundle.ios.0_72_6-reav3.hbc.gz`);
    });
  });
});
