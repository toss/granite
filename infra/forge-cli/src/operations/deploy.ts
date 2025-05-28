import * as p from '@clack/prompts';
import { DeployManager, DeploymentState, NoSuchKey, type S3Client } from '@granite-js/deployment-manager';
import { generateDeploymentId } from '../utils/generateDeploymentId';
import { gzipFile } from '../utils/gzip';
import { handlePrompts } from '../utils/handlePrompts';

interface DeployConfig {
  androidBundle: string;
  iosBundle: string;
  appName: string;
  tag?: string;
  groupId?: string;
}

export const deploy = handlePrompts<
  ({ androidBundle, iosBundle, appName, tag }: DeployConfig, context: { s3Client: S3Client }) => void
>('Start deployment', deployImpl);

async function deployImpl({ androidBundle, iosBundle, appName, tag }: DeployConfig, context: { s3Client: S3Client }) {
  const { s3Client } = context;

  const gzippedAndroidBundle = `${androidBundle}.gz`;
  const gzippedIosBundle = `${iosBundle}.gz`;

  await Promise.all([
    gzipFile({ inputFile: androidBundle, outputFile: gzippedAndroidBundle }),
    gzipFile({ inputFile: iosBundle, outputFile: gzippedIosBundle }),
  ]);

  const deploymentId = generateDeploymentId();
  const deployedAt = new Date();
  let spinner = p.spinner();

  spinner.start('Fetching current deployment state...');
  const currentDeploymentState = await DeployManager.readDeploymentState(appName, { s3Client }).catch(
    handleReadDeploymentStateError
  );
  spinner.stop('Successfully fetched current deployment state');

  let newDeploymentState: DeploymentState;
  if (currentDeploymentState != null) {
    p.log.info('Planning rollout...');
    newDeploymentState = await DeployManager.planRollout(currentDeploymentState, {
      progress: 100, // TODO
      targetDeploymentId: deploymentId,
    });

    switch (newDeploymentState.type) {
      case 'STABLE':
        p.log.info(`Stable deployment planned (target: ${newDeploymentState.deploymentId})`);
        break;

      case 'CANARY':
      case 'PENDING':
        console.error('unimplemented yet');
        process.exit(1);
    }
  } else {
    p.log.warn('No deployment state found');
    newDeploymentState = { type: 'STABLE', deploymentId };
  }

  if (process.stdin.isTTY) {
    const confirmed = await p.confirm({
      message: `Are you sure you want to deploy ${appName}?`,
    });

    if (!confirmed || p.isCancel(confirmed)) {
      p.outro('Deployment cancelled');
      process.exit(0);
    }
  }

  await p.tasks(
    [
      { bundlePath: gzippedAndroidBundle, platform: 'android' as const },
      { bundlePath: gzippedIosBundle, platform: 'ios' as const },
    ].map(({ bundlePath, platform }) => ({
      title: `Uploading bundle... (${platform})`,
      task: async () => {
        DeployManager.uploadBundle(
          {
            bundlePath,
            appName,
            platform,
            tag,
            deploymentId,
            deployedAt,
          },
          { s3Client }
        );

        return 'Bundle uploaded';
      },
    }))
  );

  spinner = p.spinner();
  spinner.start('Updating bundle list...');
  await DeployManager.updateBundleList(
    {
      appName: appName,
      newDeploymentInfo: {
        deployedAt: deployedAt.getTime(),
        deploymentId,
      },
    },
    { s3Client }
  );
  spinner.stop('Bundle list updated');

  spinner = p.spinner();
  spinner.start(`Deploying ${appName}@${deploymentId}...`);
  await DeployManager.rollout({ state: newDeploymentState, appName }, { s3Client });
  spinner.stop(`Deployed successfully! (Deployment ID: ${deploymentId})`);

  p.outro('Done');
}

function handleReadDeploymentStateError(error: unknown) {
  if (error instanceof NoSuchKey) {
    return null;
  }
  throw error;
}
