import * as p from '@clack/prompts';
import { DeployManager, type DeploymentContext, NoSuchKey, validateChannel } from '@granite-js/deployment-manager';
import { handlePrompts } from '../utils/handlePrompts';

interface DeployListOptions {
  appName: string;
}

export const deployList = handlePrompts('Deployment list', deployListImpl);

async function deployListImpl({ appName }: DeployListOptions, context: DeploymentContext) {
  if (context.channel !== undefined) {
    validateChannel(context.channel);
  }
  p.log.info(`Deployment target: ${appName} (channel: ${context.channel ?? 'legacy / unscoped'})`);
  const spinner = p.spinner();

  spinner.start('Fetching deployment list...');
  const deployments = await DeployManager.readBundleList(appName, context).catch(handleReadBundleListError);
  spinner.stop('Successfully fetched deployment list');

  deployments.slice(0, 20).forEach((deployment, index) => {
    p.log.info(
      `${index + 1}. ${deployment.deploymentId} (Deployed at: ${new Date(deployment.deployedAt).toLocaleString()})`
    );
  });

  p.outro(deployments.length ? `${deployments.length} deployment(s) found` : 'No deployments found');
}

function handleReadBundleListError(error: unknown) {
  if (error instanceof NoSuchKey) {
    return [];
  }

  throw error;
}
