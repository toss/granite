import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { S3Client as BaseS3Client, GetObjectCommand, PutObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeployManager } from './DeployManager';
import { validateChannel } from './channel';
import { InvalidRequest } from './errors/InvalidRequest';
import { S3Client, paths } from './s3';

describe('deployment channels', () => {
  const mock = mockClient(BaseS3Client);
  const s3Client = new S3Client({ bucket: 'sample-bucket' });
  const objects = new Map<string, string>();
  const appName = 'sample-app';
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'deployment-channels-'));
    objects.clear();
    mock.on(PutObjectCommand).callsFake(async ({ Key, Body }) => {
      const data = Body instanceof Readable ? await Body.toArray() : [Body];
      objects.set(Key, data.join(''));
      return {};
    });
    mock.on(GetObjectCommand).callsFake(({ Key }) => {
      const value = objects.get(Key);
      if (value === undefined) {
        throw new NoSuchKey({ $metadata: {}, message: 'Not found' });
      }
      return { Body: { transformToString: async () => value } };
    });
  });

  afterEach(async () => {
    mock.reset();
    await rm(directory, { recursive: true, force: true });
  });

  it('isolates uploads, history and rollout for the same app and deployment ID', async () => {
    const bundlePath = join(directory, 'bundle.hbc.gz');
    for (const channel of [undefined, 'stable', 'preview']) {
      const context = { s3Client, channel };
      const contents = channel ?? 'legacy';
      await writeFile(bundlePath, contents);
      for (const platform of ['ios', 'android'] as const) {
        const result = await DeployManager.uploadBundle(
          { appName, platform, bundlePath, deploymentId: 'release', deployedAt: new Date(0) },
          context
        );
        expect(objects.get(result.bundlePathKey)).toBe(contents);
      }
      await DeployManager.updateBundleList(
        { appName, newDeploymentInfo: { deploymentId: contents, deployedAt: 0 } },
        context
      );
      await DeployManager.rollout({ appName, state: { type: 'STABLE', deploymentId: contents } }, context);
    }

    for (const channel of [undefined, 'stable', 'preview']) {
      const context = { s3Client, channel };
      expect(await DeployManager.readBundleList(appName, context)).toEqual([
        { deploymentId: channel ?? 'legacy', deployedAt: 0 },
      ]);
      expect(
        await DeployManager.resolveDeploymentId({ appName, groupId: '1', allowAccessCluster: false }, context)
      ).toBe(channel ?? 'legacy');
      for (const platform of ['ios', 'android'] as const) {
        const key = DeployManager.resolveBundle({ appName, platform, deploymentId: 'release', channel });
        expect(objects.get(key)).toBe(channel ?? 'legacy');
      }
    }
    expect(objects.size).toBe(12);
  });

  it('keeps canary selection and rollback inside a channel', async () => {
    for (const channel of [undefined, 'stable', 'preview']) {
      await DeployManager.rollout(
        { appName, state: { type: 'STABLE', deploymentId: channel ?? 'legacy' } },
        { s3Client, channel }
      );
    }
    const context = { s3Client, channel: 'preview' };
    const state = await DeployManager.planRollout(await DeployManager.readDeploymentState(appName, context), {
      progress: 50,
      targetDeploymentId: 'next',
    });
    expect(state.type).toBe('CANARY');
    if (state.type !== 'CANARY') {
      throw new Error('Expected a canary state');
    }
    await DeployManager.rollout({ appName, state }, context);
    for (const [index, expected] of [
      [0, 'next'],
      [999, 'preview'],
    ] as const) {
      expect(
        await DeployManager.resolveDeploymentId(
          { appName, groupId: state.groupIdsCandidate[index]!, allowAccessCluster: false },
          context
        )
      ).toBe(expected);
    }
    const rollback = await DeployManager.planRollout(state, { progress: 0, targetDeploymentId: 'next' });
    await DeployManager.rollout({ appName, state: rollback }, context);
    expect(await DeployManager.readDeploymentState(appName, context)).toEqual(rollback);
    for (const groupId of ['1', '1000']) {
      expect(await DeployManager.resolveDeploymentId({ appName, groupId, allowAccessCluster: false }, context)).toBe(
        'preview'
      );
    }
    expect(await DeployManager.readDeploymentState(appName, { s3Client })).toEqual({
      type: 'STABLE',
      deploymentId: 'legacy',
    });
    expect(await DeployManager.readDeploymentState(appName, { s3Client, channel: 'stable' })).toEqual({
      type: 'STABLE',
      deploymentId: 'stable',
    });
  });

  it('publishes cluster pointers where readers resolve them, independently for each channel', async () => {
    for (const channel of [undefined, 'stable', 'preview']) {
      await DeployManager.rolloutCluster(
        { appName, deploymentId: channel ?? 'legacy', clusterId: 'testers' },
        { s3Client, channel }
      );
    }
    for (const channel of [undefined, 'stable', 'preview']) {
      const context = { s3Client, channel };
      expect(await DeployManager.readCluster({ appName, clusterId: 'testers' }, context)).toBe(channel ?? 'legacy');
      expect(
        await DeployManager.resolveDeploymentId({ appName, groupId: 'testers', allowAccessCluster: true }, context)
      ).toBe(channel ?? 'legacy');
    }
  });

  it('never falls back to legacy state or history for an empty channel', async () => {
    await DeployManager.rollout({ appName, state: { type: 'STABLE', deploymentId: 'legacy' } }, { s3Client });
    const context = { s3Client, channel: 'preview' };
    await expect(DeployManager.readDeploymentState(appName, context)).rejects.toBeInstanceOf(NoSuchKey);
    await expect(DeployManager.readBundleList(appName, context)).rejects.toBeInstanceOf(NoSuchKey);
    expect(await DeployManager.readCluster({ appName, clusterId: 'testers' }, context)).toBeNull();
  });

  it.each(['', '../stable', 'a/b', 'a%2Fb', '.', 'a.b', 'a b', '*', 'a?b', 'a'.repeat(65)])(
    'rejects invalid channel %j before accessing storage',
    async (channel) => {
      expect(() => validateChannel(channel)).toThrow(InvalidRequest);
      await expect(
        DeployManager.rollout({ appName, state: { type: 'STABLE', deploymentId: 'release' } }, { s3Client, channel })
      ).rejects.toBeInstanceOf(InvalidRequest);
      await expect(
        DeployManager.readCluster({ appName, clusterId: 'testers' }, { s3Client, channel })
      ).rejects.toBeInstanceOf(InvalidRequest);
      expect(mock.calls()).toHaveLength(0);
    }
  );

  it('preserves legacy paths and treats tags separately from case-sensitive channel names', () => {
    expect(paths.bundleList({ appName })).toBe('deployments/sample-app/DEPLOYMENTS');
    expect(paths.deploymentState({ appName })).toBe('deployments/sample-app/deployment_state');
    expect(paths.clusterDeploymentInfoPath({ appName, clusterId: 'testers' })).toBe(
      'deployments/sample-app/clusters/testers.deploymentInfo'
    );
    expect(DeployManager.resolveBundle({ appName, platform: 'ios', deploymentId: 'release', tag: 'custom' })).toBe(
      'bundles/sample-app/release/bundle.ios.custom.hbc.gz'
    );
    expect(
      DeployManager.resolveBundle({
        appName,
        platform: 'ios',
        deploymentId: 'release',
        tag: 'custom',
        channel: 'Preview_2',
      })
    ).toBe('channels/Preview_2/bundles/sample-app/release/bundle.ios.custom.hbc.gz');
  });
});
